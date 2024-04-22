/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { BaseMessage } from '@langchain/core/messages';
import { Logger } from '@kbn/logging';
import { KibanaRequest, ResponseHeaders } from '@kbn/core-http-server';
import type { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import type { AnalyticsServiceSetup } from '@kbn/core-analytics-server';
import { ExecuteConnectorRequestBody, Message, Replacements } from '@kbn/elastic-assistant-common';
import { StreamFactoryReturnType } from '@kbn/ml-response-stream/server';
import { AnonymizationFieldResponse } from '@kbn/elastic-assistant-common/impl/schemas/anonymization_fields/bulk_crud_anonymization_fields_route.gen';
import { ResponseBody } from '../types';
import type { AssistantTool } from '../../../types';

export interface AgentExecutorParams<T extends boolean> {
  abortSignal?: AbortSignal;
  alertsIndexPattern?: string;
  actions: ActionsPluginStart;
  anonymizationFields?: AnonymizationFieldResponse[];
  isEnabledKnowledgeBase: boolean;
  assistantTools?: AssistantTool[];
  connectorId: string;
  esClient: ElasticsearchClient;
  kbResource: string | undefined;
  langChainMessages: BaseMessage[];
  llmType?: string;
  logger: Logger;
  onNewReplacements?: (newReplacements: Replacements) => void;
  replacements: Replacements;
  isStream?: T;
  onLlmResponse?: (
    content: string,
    traceData?: Message['traceData'],
    isError?: boolean
  ) => Promise<void>;
  request: KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  size?: number;
  elserId?: string;
  traceOptions?: TraceOptions;
  telemetry: AnalyticsServiceSetup;
}

export interface StaticReturnType {
  body: ResponseBody;
  headers: ResponseHeaders;
}
export type AgentExecutorResponse<T extends boolean> = T extends true
  ? StreamFactoryReturnType['responseWithHeaders']
  : StaticReturnType;

export type AgentExecutor<T extends boolean> = (
  params: AgentExecutorParams<T>
) => Promise<AgentExecutorResponse<T>>;

export type AgentExecutorEvaluator = (
  langChainMessages: BaseMessage[],
  exampleId?: string
) => Promise<ResponseBody>;

export interface AgentExecutorEvaluatorWithMetadata {
  agentEvaluator: AgentExecutorEvaluator;
  metadata: {
    connectorName: string;
    runName: string;
  };
}

export interface TraceOptions {
  evaluationId?: string;
  exampleId?: string;
  projectName?: string;
  runName?: string;
  tags?: string[];
  tracers?: LangChainTracer[];
}
