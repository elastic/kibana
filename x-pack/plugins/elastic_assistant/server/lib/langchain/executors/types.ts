/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { BaseMessage } from 'langchain/schema';
import { Logger } from '@kbn/logging';
import { KibanaRequest } from '@kbn/core-http-server';
import type { LangChainTracer } from 'langchain/callbacks';
import { RequestBody, ResponseBody } from '../types';
import type { AssistantTool } from '../../../types';

export interface AgentExecutorParams {
  alertsIndexPattern?: string;
  actions: ActionsPluginStart;
  allow?: string[];
  allowReplacement?: string[];
  assistantLangChain: boolean;
  assistantTools?: AssistantTool[];
  connectorId: string;
  esClient: ElasticsearchClient;
  kbResource: string | undefined;
  langChainMessages: BaseMessage[];
  llmType?: string;
  logger: Logger;
  onNewReplacements?: (newReplacements: Record<string, string>) => void;
  replacements?: Record<string, string>;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  size?: number;
  elserId?: string;
  traceOptions?: TraceOptions;
}

export type AgentExecutorResponse = Promise<ResponseBody>;

export type AgentExecutor = (params: AgentExecutorParams) => AgentExecutorResponse;

export type AgentExecutorEvaluator = (
  langChainMessages: BaseMessage[],
  exampleId?: string
) => AgentExecutorResponse;

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
