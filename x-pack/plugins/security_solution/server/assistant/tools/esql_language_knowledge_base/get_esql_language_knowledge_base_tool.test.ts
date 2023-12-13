/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrievalQAChain } from 'langchain/chains';
import type { DynamicTool } from 'langchain/tools';
import { ESQL_KNOWLEDGE_BASE_TOOL } from './get_esql_language_knowledge_base_tool';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { RequestBody } from '@kbn/elastic-assistant-plugin/server/lib/langchain/types';

const chain = {} as RetrievalQAChain;

describe('EsqlLanguageKnowledgeBaseTool', () => {
  describe('getTool', () => {
    const esClient = {
      search: jest.fn().mockResolvedValue({}),
    } as unknown as ElasticsearchClient;
    const request = {
      body: {
        assistantLangChain: false,
        alertsIndexPattern: '.alerts-security.alerts-default',
        allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
        allowReplacement: ['user.name'],
        replacements: { key: 'value' },
        size: 20,
      },
    } as unknown as KibanaRequest<unknown, unknown, RequestBody>;
    const rest = {
      esClient,
      request,
    };

    it('returns null if assistantLangChain is false', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        assistantLangChain: false,
        chain,
        modelExists: true,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null if modelExists is false (the ELSER model is not installed)', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        assistantLangChain: true,
        chain,
        modelExists: false, // <-- ELSER model is not installed
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('should return a Tool instance if assistantLangChain and modelExists are true', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        assistantLangChain: true,
        chain,
        modelExists: true,
        ...rest,
      });

      expect(tool?.name).toEqual('ESQLKnowledgeBaseTool');
    });

    it('should return a tool with the expected tags', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        assistantLangChain: true,
        chain,
        modelExists: true,
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['esql', 'query-generation', 'knowledge-base']);
    });
  });
});
