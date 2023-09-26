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
import { ResponseBody } from '../helpers';

export interface AgentExecutorParams {
  actions: ActionsPluginStart;
  connectorId: string;
  esClient: ElasticsearchClient;
  langChainMessages: BaseMessage[];
  logger: Logger;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: KibanaRequest<unknown, unknown, any, any>;
}

export type AgentExecutorResponse = Promise<ResponseBody>;

export type AgentExecutor = (params: AgentExecutorParams) => AgentExecutorResponse;

export type AgentExecutorEvaluator = (langChainMessages: BaseMessage[]) => AgentExecutorResponse;
