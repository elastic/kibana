/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrievalQAChain } from 'langchain/chains';
import type { DynamicTool } from 'langchain/tools';
import { ESQL_KNOWLEDGE_BASE_TOOL } from './esql_language_knowledge_base_tool';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';

describe('EsqlLanguageKnowledgeBaseTool', () => {
  const chain = {} as RetrievalQAChain;
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const request = {
    body: {
      isEnabledKnowledgeBase: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements: { key: 'value' },
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const rest = {
    chain,
    esClient,
    request,
  };

  describe('isSupported', () => {
    it('returns false if isEnabledKnowledgeBase is false', () => {
      const params = {
        isEnabledKnowledgeBase: false,
        modelExists: true,
        ...rest,
      };

      expect(ESQL_KNOWLEDGE_BASE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false if modelExists is false (the ELSER model is not installed)', () => {
      const params = {
        isEnabledKnowledgeBase: true,
        modelExists: false, // <-- ELSER model is not installed
        ...rest,
      };

      expect(ESQL_KNOWLEDGE_BASE_TOOL.isSupported(params)).toBe(false);
    });

    it('returns true if isEnabledKnowledgeBase and modelExists are true', () => {
      const params = {
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      };

      expect(ESQL_KNOWLEDGE_BASE_TOOL.isSupported(params)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns null if isEnabledKnowledgeBase is false', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        isEnabledKnowledgeBase: false,
        modelExists: true,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null if modelExists is false (the ELSER model is not installed)', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: false, // <-- ELSER model is not installed
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('should return a Tool instance if isEnabledKnowledgeBase and modelExists are true', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      });

      expect(tool?.name).toEqual('ESQLKnowledgeBaseTool');
    });

    it('should return a tool with the expected tags', () => {
      const tool = ESQL_KNOWLEDGE_BASE_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['esql', 'query-generation', 'knowledge-base']);
    });
  });
});
