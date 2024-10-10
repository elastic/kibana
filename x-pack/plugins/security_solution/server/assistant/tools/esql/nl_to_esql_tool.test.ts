/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RetrievalQAChain } from 'langchain/chains';
import type { DynamicTool } from '@langchain/core/tools';
import { NL_TO_ESQL_TOOL } from './nl_to_esql_tool';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';
import { loggerMock } from '@kbn/logging-mocks';
import { getPromptSuffixForOssModel } from './common';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';

describe('NaturalLanguageESQLTool', () => {
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
  const logger = loggerMock.create();
  const inference = {} as InferenceServerStart;
  const connectorId = 'fake-connector';
  const rest = {
    chain,
    esClient,
    logger,
    request,
    inference,
    connectorId,
  };

  describe('isSupported', () => {
    it('returns false if isEnabledKnowledgeBase is false', () => {
      const params = {
        isEnabledKnowledgeBase: false,
        modelExists: true,
        ...rest,
      };

      expect(NL_TO_ESQL_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false if modelExists is false (the ELSER model is not installed)', () => {
      const params = {
        isEnabledKnowledgeBase: true,
        modelExists: false, // <-- ELSER model is not installed
        ...rest,
      };

      expect(NL_TO_ESQL_TOOL.isSupported(params)).toBe(false);
    });

    it('returns true if isEnabledKnowledgeBase and modelExists are true', () => {
      const params = {
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      };

      expect(NL_TO_ESQL_TOOL.isSupported(params)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns null if isEnabledKnowledgeBase is false', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: false,
        modelExists: true,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null if modelExists is false (the ELSER model is not installed)', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: false, // <-- ELSER model is not installed
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null if inference plugin is not provided', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
        inference: undefined,
      });

      expect(tool).toBeNull();
    });

    it('returns null if connectorId is not provided', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
        connectorId: undefined,
      });

      expect(tool).toBeNull();
    });

    it('should return a Tool instance if isEnabledKnowledgeBase and modelExists are true', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      });

      expect(tool?.name).toEqual('NaturalLanguageESQLTool');
    });

    it('should return a tool with the expected tags', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['esql', 'query-generation', 'knowledge-base']);
    });

    it('should return tool with the expected description for OSS model', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        isOssModel: true,
        ...rest,
      }) as DynamicTool;

      expect(tool.description).toContain(getPromptSuffixForOssModel('NaturalLanguageESQLTool'));
    });

    it('should return tool with the expected description for non-OSS model', () => {
      const tool = NL_TO_ESQL_TOOL.getTool({
        isEnabledKnowledgeBase: true,
        modelExists: true,
        isOssModel: false,
        ...rest,
      }) as DynamicTool;

      expect(tool.description).not.toContain(getPromptSuffixForOssModel('NaturalLanguageESQLTool'));
    });
  });
});
