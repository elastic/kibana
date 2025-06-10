/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantMessage, MessageRole } from '@kbn/inference-common';
import {
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis';
import { compact, findLast } from 'lodash';
import { from, Observable, of, switchMap } from 'rxjs';
import { observeInvestigationResults } from './tasks/observe_investigation_results';
import {
  InvestigateEntityToolMessage,
  ObservationToolMessage,
  RootCauseAnalysisContext,
  RootCauseAnalysisEvent,
} from './types';

export function callObserveTool({
  rcaContext,
  toolCallId,
}: {
  rcaContext: RootCauseAnalysisContext;
  toolCallId: string;
}): Observable<ObservationToolMessage> {
  const { events } = rcaContext;

  const lastAssistantMessage = findLast(
    events.slice(0, -1),
    (event): event is Extract<RootCauseAnalysisEvent, AssistantMessage> =>
      event.role === MessageRole.Assistant
  );

  const toolMessagesByToolCallId = Object.fromEntries(
    compact(
      events.map((message) =>
        'toolCallId' in message &&
        (message.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME || message.name === 'error')
          ? [message.toolCallId, message]
          : undefined
      )
    )
  );

  const investigationToolMessages =
    lastAssistantMessage && lastAssistantMessage.toolCalls
      ? compact(
          lastAssistantMessage.toolCalls.map((investigateEntityToolCall) => {
            if (investigateEntityToolCall.function.name !== RCA_INVESTIGATE_ENTITY_TOOL_NAME) {
              return undefined;
            }
            return {
              toolCall: investigateEntityToolCall,
              toolResponse: toolMessagesByToolCallId[investigateEntityToolCall.toolCallId],
            };
          })
        )
      : [];

  const investigations = investigationToolMessages
    .map((toolMessage) => toolMessage.toolResponse)
    .filter(
      (toolResponse): toolResponse is InvestigateEntityToolMessage =>
        toolResponse.name === RCA_INVESTIGATE_ENTITY_TOOL_NAME
    )
    .map((toolResponse) => ({ ...toolResponse.data, ...toolResponse.response }));

  return from(
    observeInvestigationResults({
      rcaContext,
      investigations,
    })
  ).pipe(
    switchMap((summary) => {
      const observationToolMessage: ObservationToolMessage = {
        name: RCA_OBSERVE_TOOL_NAME,
        response: {
          content: summary.content,
        },
        data: summary,
        role: MessageRole.Tool,
        toolCallId,
      };
      return of(observationToolMessage);
    })
  );
}
