/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClient } from '@kbn/alerting-plugin/server';
import { calculateAuto } from '@kbn/calculate-auto';
import { MessageRole, AssistantMessage, ToolMessage, ToolChoiceType } from '@kbn/inference-common';
import { InferenceClient } from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { findLast, pick } from 'lodash';
import moment from 'moment';
import { catchError, filter, from, map, mergeMap, Observable, of, switchMap } from 'rxjs';
import { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis';
import { callEndRcaProcessTool } from './call_end_rca_process_tool';
import { callInvestigateEntityTool } from './call_investigate_entity_tool';
import { callObserveTool } from './call_observe_tool';
import { RCA_PROMPT_CHANGES, RCA_PROMPT_ENTITIES, RCA_SYSTEM_PROMPT_BASE } from './prompts';
import { RCA_TOOLS } from './tools';
import {
  EndProcessToolMessage,
  InvestigateEntityToolMessage,
  ObservationToolMessage,
  RootCauseAnalysisContext,
  RootCauseAnalysisEvent,
  ToolErrorMessage,
} from './types';
import { callTools } from './util/call_tools';
import { formatEntity } from './util/format_entity';
import { validateInvestigateEntityToolCalls } from './util/validate_investigate_entity_tool_call';

const SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS = `${RCA_SYSTEM_PROMPT_BASE}

Your next step is to request an observation from another agent based
on the initial context or the results of previous investigations.`;

const SYSTEM_PROMPT_WITH_DECISION_INSTRUCTIONS = `${RCA_SYSTEM_PROMPT_BASE}

${RCA_PROMPT_ENTITIES}

${RCA_PROMPT_CHANGES}

  To determine whether to end the process or continue analyzing another entity,
follow the advice from the previous observation, and these tips:

  Continuing the process:
  - Do not investigate an entity twice. This will result in a failure.
  - Logs, traces, or observability data that suggest upstream or downstream
issues (such as connection failures, timeouts, or authentication errors)
indicate further investigation is required.
  
  Ending the process:
  - No further entities to investigate: If there are no unexplored upstream or
downstream dependencies, and all related entities have been investigated without
discovering new anomalies, it may be appropriate to end the process.
  - If all investigated entities (e.g., services, hosts, containers) are
functioning normally, with no relevant issues found, and there are no signs of
dependencies being affected, you may consider ending the process.
  - Avoid concluding the investigation based solely on symptoms or the absence
of immediate errors in the data. Unless a system change has been connected to
the incident, it is important to continue investigating dependencies to ensure
the root cause has been accurately identified.`;

export function runRootCauseAnalysis({
  serviceName,
  start: requestedStart,
  end: requestedEnd,
  esClient,
  alertsClient,
  rulesClient,
  observabilityAIAssistantClient,
  spaceId,
  indices,
  connectorId,
  inferenceClient,
  context: initialContext,
  logger: incomingLogger,
  prevEvents,
}: {
  context: string;
  serviceName: string;
  logger: Logger;
  inferenceClient: InferenceClient;
  start: number;
  end: number;
  alertsClient: AlertsClient;
  rulesClient: RulesClient;
  esClient: TracedElasticsearchClient;
  observabilityAIAssistantClient: ObservabilityAIAssistantClient;
  indices: {
    logs: string[];
    traces: string[];
    sloSummaries: string[];
  };
  connectorId: string;
  spaceId: string;
  prevEvents?: RootCauseAnalysisEvent[];
}): Observable<RootCauseAnalysisEvent> {
  const logger = incomingLogger.get('rca');

  const entity = { 'service.name': serviceName };

  const bucketSize = calculateAuto
    .atLeast(30, moment.duration(requestedEnd - requestedStart))!
    .asMilliseconds();

  const start = Math.floor(requestedStart / bucketSize) * bucketSize;
  const end = Math.floor(requestedEnd / bucketSize) * bucketSize;

  const initialMessage = {
    role: MessageRole.User as const,
    content: `Investigate the health status of ${formatEntity(entity)}.
    
    The context given for this investigation is:

    ${initialContext}`,
  };

  const nextEvents = [initialMessage, ...(prevEvents ?? [])];

  const initialRcaContext: RootCauseAnalysisContext = {
    connectorId,
    start,
    end,
    esClient,
    events: nextEvents,
    indices,
    inferenceClient,
    initialContext,
    alertsClient,
    observabilityAIAssistantClient,
    logger,
    rulesClient,
    spaceId,
    tokenLimit: 32_000,
  };

  const investigationTimeRangePrompt = `## Time range
  
    The time range of the investigation is ${new Date(start).toISOString()} until ${new Date(
    end
  ).toISOString()}`;

  initialContext = `${initialContext}

  ${investigationTimeRangePrompt}
  `;

  const next$ = callTools(
    {
      system: RCA_SYSTEM_PROMPT_BASE,
      connectorId,
      inferenceClient,
      messages: nextEvents,
      logger,
    },
    ({ messages }) => {
      const lastSuccessfulToolResponse = findLast(
        messages,
        (message) => message.role === MessageRole.Tool && message.name !== 'error'
      ) as Exclude<ToolMessage, ToolErrorMessage> | undefined;

      const shouldWriteObservationNext =
        !lastSuccessfulToolResponse || lastSuccessfulToolResponse.name !== RCA_OBSERVE_TOOL_NAME;

      const nextTools = shouldWriteObservationNext
        ? pick(RCA_TOOLS, RCA_OBSERVE_TOOL_NAME)
        : pick(RCA_TOOLS, RCA_END_PROCESS_TOOL_NAME, RCA_INVESTIGATE_ENTITY_TOOL_NAME);

      const nextSystem = shouldWriteObservationNext
        ? SYSTEM_PROMPT_WITH_OBSERVE_INSTRUCTIONS
        : SYSTEM_PROMPT_WITH_DECISION_INSTRUCTIONS;

      return {
        messages,
        system: `${nextSystem}

        ${investigationTimeRangePrompt}`,
        tools: nextTools,
        toolChoice: shouldWriteObservationNext
          ? { function: RCA_OBSERVE_TOOL_NAME }
          : ToolChoiceType.required,
      };
    },
    ({
      toolCalls,
      messages,
    }): Observable<
      | ObservationToolMessage
      | ToolErrorMessage
      | InvestigateEntityToolMessage
      | EndProcessToolMessage
      | AssistantMessage
    > => {
      const nextRcaContext = {
        ...initialRcaContext,
        events: messages as RootCauseAnalysisEvent[],
      };

      return of(undefined).pipe(
        switchMap(() => {
          return from(
            validateInvestigateEntityToolCalls({ rcaContext: nextRcaContext, toolCalls })
          );
        }),
        switchMap((errors) => {
          if (errors.length) {
            return of(
              ...toolCalls.map((toolCall) => {
                const toolCallErrorMessage: ToolErrorMessage = {
                  role: MessageRole.Tool,
                  name: 'error',
                  response: {
                    error: {
                      message: `Some ${RCA_INVESTIGATE_ENTITY_TOOL_NAME} calls were not valid:
                      ${errors.map((error) => `- ${error}`).join('\n')}`,
                    },
                  },
                  toolCallId: toolCall.toolCallId,
                };
                return toolCallErrorMessage;
              })
            );
          }
          return of(...toolCalls).pipe(
            mergeMap((toolCall) => {
              function executeToolCall(): Observable<
                | EndProcessToolMessage
                | InvestigateEntityToolMessage
                | ObservationToolMessage
                | ToolErrorMessage
                | AssistantMessage
              > {
                switch (toolCall.function.name) {
                  case RCA_END_PROCESS_TOOL_NAME:
                    return callEndRcaProcessTool({
                      rcaContext: nextRcaContext,
                      toolCallId: toolCall.toolCallId,
                    });

                  case RCA_INVESTIGATE_ENTITY_TOOL_NAME:
                    return callInvestigateEntityTool({
                      context: toolCall.function.arguments.context,
                      field: toolCall.function.arguments.entity.field,
                      value: toolCall.function.arguments.entity.value,
                      rcaContext: nextRcaContext,
                      toolCallId: toolCall.toolCallId,
                    });

                  case RCA_OBSERVE_TOOL_NAME:
                    return callObserveTool({
                      rcaContext: nextRcaContext,
                      toolCallId: toolCall.toolCallId,
                    });
                }
              }

              return executeToolCall().pipe(
                catchError((error) => {
                  logger.error(`Failed executing task: ${error.message}`);
                  logger.error(error);
                  const toolErrorMessage: ToolErrorMessage = {
                    name: 'error',
                    role: MessageRole.Tool,
                    response: {
                      error: {
                        ...('toJSON' in error && typeof error.toJSON === 'function'
                          ? error.toJSON()
                          : {}),
                        message: error.message,
                      },
                    },
                    toolCallId: toolCall.toolCallId,
                  };
                  return of(toolErrorMessage);
                })
              );
            }, 3)
          );
        })
      );
    }
  );

  return next$.pipe(
    filter((event) =>
      Boolean(event.role !== MessageRole.Assistant || event.content || event.toolCalls?.length)
    ),
    map((event) => {
      if (event.role === MessageRole.Assistant) {
        return event as Extract<RootCauseAnalysisEvent, AssistantMessage>;
      }
      return event;
    })
  );
}
