/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ToolMessage,
  UserMessage,
  ToolChoice,
  AssistantMessageOf,
  InferenceClient,
  ToolCallOfToolOptions,
} from '@kbn/inference-common';
import type { Logger } from '@kbn/logging';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { ObservabilityAIAssistantClient } from '@kbn/observability-ai-assistant-plugin/server';
import type { TracedElasticsearchClient } from '@kbn/traced-es-client';
import type {
  RCA_END_PROCESS_TOOL_NAME,
  RCA_INVESTIGATE_ENTITY_TOOL_NAME,
  RCA_OBSERVE_TOOL_NAME,
} from '@kbn/observability-ai-common/root_cause_analysis';
import type { ObservationStepSummary } from './tasks/observe_investigation_results';
import type { EntityInvestigation } from './tasks/investigate_entity';
import type { SignificantEventsTimeline } from './tasks/generate_timeline';
import type { RCA_TOOLS } from './tools';

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
      toolChoice: ToolChoice<keyof typeof RCA_TOOLS>;
    }>;

export type RootCauseAnalysisToolRequest<
  TToolName extends keyof typeof RCA_TOOLS = keyof typeof RCA_TOOLS
> = ToolCallOfToolOptions<{
  tools: Pick<typeof RCA_TOOLS, TToolName>;
}>;

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
