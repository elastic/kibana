/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { KibanaRequest } from '@kbn/core-http-server';
import { RetrievalQAChain } from 'langchain/chains';
import { Tool } from 'langchain/tools';

import { getAlertCountsTool } from './alert_counts/get_alert_counts_tool';
import { getEsqlLanguageKnowledgeBaseTool } from './esql_language_knowledge_base/get_esql_language_knowledge_base_tool';
import { getOpenAlertsTool } from './open_alerts/get_open_alerts_tool';
import type { RequestBody } from '../types';

export interface GetApplicableTools {
  alertsIndexPattern?: string;
  allow?: string[];
  allowReplacement?: string[];
  assistantLangChain: boolean;
  chain: RetrievalQAChain;
  esClient: ElasticsearchClient;
  modelExists: boolean;
  onNewReplacements?: (newReplacements: Record<string, string>) => void;
  replacements?: Record<string, string>;
  request: KibanaRequest<unknown, unknown, RequestBody>;
  size?: number;
}

export const getApplicableTools = ({
  alertsIndexPattern,
  allow,
  allowReplacement,
  assistantLangChain,
  chain,
  esClient,
  modelExists,
  onNewReplacements,
  replacements,
  request,
  size,
}: GetApplicableTools): Tool[] =>
  [
    getEsqlLanguageKnowledgeBaseTool({ assistantLangChain, chain, modelExists }) ?? [],
    getAlertCountsTool({
      alertsIndexPattern,
      esClient,
      replacements,
      request,
    }) ?? [],
    getOpenAlertsTool({
      alertsIndexPattern,
      allow,
      allowReplacement,
      esClient,
      onNewReplacements,
      replacements,
      request,
      size,
    }) ?? [],
  ].flat();
