/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ToolMessage,
  UserMessage,
  ToolCallsOf,
  ToolChoice,
  AssistantMessageOf,
  InferenceClient,
} from '@kbn/inference-common';
import { Logger } from '@kbn/logging';
import { AlertsClient } from '@kbn/rule-registry-plugin/server';
import { RulesClient } from '@kbn/alerting-plugin/server';
import { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server';
import { TracedElasticsearchClient } from '@kbn/traced-es-client';
import {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis';
import { ObservationStepSummary } from './tasks/observe_investigation_results';
import { EntityInvestigation } from './tasks/investigate_entity';
import { SignificantEventsTimeline } from './tasks/generate_timeline';
import { RCA_TOOLS } from './tools';

export type EndProcessToolMessage = ToolMessage<
  typeof RCA_END_PROCESS_TOOL_NAME,
  {
    report: string;
    timeline: SignificantEventsTimeline;
  }
>;

export type ObservationToolMessage = ToolMessage<
  typeof RCA_OBSERVE_TOOL_NAME,
  {
    content: string;
  },
  ObservationStepSummary
>;

export type InvestigateEntityToolMessage = ToolMessage<
  typeof RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  Pick<EntityInvestigation, 'entity' | 'summary' | 'relatedEntities'>,
  { attachments: EntityInvestigation['attachments'] }
>;

export type ToolErrorMessage = ToolMessage<
  'error',
  {
    error: {
      message: string;
    };
  }
>;

export type RootCauseAnalysisEvent =
  | RootCauseAnalysisToolMessage
  | ToolErrorMessage
  | UserMessage
  | AssistantMessageOf<{
      tools: typeof RCA_TOOLS;
      toolChoice?: ToolChoice<keyof typeof RCA_TOOLS>;
    }>;

export type RootCauseAnalysisToolRequest<
  TToolName extends keyof typeof RCA_TOOLS = keyof typeof RCA_TOOLS
> = ToolCallsOf<{
  tools: Pick<typeof RCA_TOOLS, TToolName>;
}>['toolCalls'][number];

export type RootCauseAnalysisToolMessage =
  | EndProcessToolMessage
  | InvestigateEntityToolMessage
  | ObservationToolMessage;

export interface RootCauseAnalysisContext {
  initialContext: string;
  start: number;
  end: number;
  events: RootCauseAnalysisEvent[];
  indices: {
    logs: string[];
    traces: string[];
    sloSummaries: string[];
  };
  inferenceClient: InferenceClient;
  tokenLimit: number;
  connectorId: string;
  esClient: TracedElasticsearchClient;
  alertsClient: AlertsClient;
  rulesClient: RulesClient;
  logger: Logger;
  spaceId: string;
  observabilityAIAssistantClient: ObservabilityAIAssistantClient;
}
