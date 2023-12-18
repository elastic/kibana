/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { DynamicTool } from 'langchain/tools';
import { omit } from 'lodash/fp';

import type { RequestBody } from '@kbn/elastic-assistant-plugin/server/lib/langchain/types';
import { ALERT_COUNTS_TOOL } from './alert_counts_tool';
import type { RetrievalQAChain } from 'langchain/chains';

describe('AlertCountsTool', () => {
  const alertsIndexPattern = 'alerts-index';
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const replacements = { key: 'value' };
  const request = {
    body: {
      assistantLangChain: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements,
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, RequestBody>;
  const assistantLangChain = true;
  const chain = {} as unknown as RetrievalQAChain;
  const modelExists = true;
  const rest = {
    assistantLangChain,
    chain,
    modelExists,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSupported', () => {
    it('returns false when the alertsIndexPattern is undefined', () => {
      const params = {
        esClient,
        request,
        ...rest,
      };

      expect(ALERT_COUNTS_TOOL.isSupported(params)).toBe(false);
    });

    it('returns false when the request is missing required anonymization parameters', () => {
      const requestMissingAnonymizationParams = {
        body: {
          assistantLangChain: false,
          alertsIndexPattern: '.alerts-security.alerts-default',
          size: 20,
        },
      } as unknown as KibanaRequest<unknown, unknown, RequestBody>;
      const params = {
        esClient,
        request: requestMissingAnonymizationParams,
        ...rest,
      };

      expect(ALERT_COUNTS_TOOL.isSupported(params)).toBe(false);
    });

    it('returns true if alertsIndexPattern is defined and request includes required anonymization parameters', () => {
      const params = {
        alertsIndexPattern,
        esClient,
        request,
        ...rest,
      };

      expect(ALERT_COUNTS_TOOL.isSupported(params)).toBe(true);
    });
  });

  describe('getTool', () => {
    it('returns a `DynamicTool` with a `func` that calls `esClient.search()` with the expected query', async () => {
      const tool: DynamicTool = ALERT_COUNTS_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,
        ...rest,
      }) as DynamicTool;

      await tool.func('');

      expect(esClient.search).toHaveBeenCalledWith({
        aggs: { statusBySeverity: { terms: { field: 'kibana.alert.severity' } } },
        index: ['alerts-index'],
        query: {
          bool: {
            filter: [
              {
                bool: {
                  filter: [{ match_phrase: { 'kibana.alert.workflow_status': 'open' } }],
                  must_not: [{ exists: { field: 'kibana.alert.building_block_type' } }],
                },
              },
              { range: { '@timestamp': { gte: 'now/d', lte: 'now/d' } } },
            ],
          },
        },
        size: 0,
      });
    });

    it('returns null when the request is missing required anonymization parameters', () => {
      const requestWithMissingParams = omit('body.allow', request) as unknown as KibanaRequest<
        unknown,
        unknown,
        RequestBody
      >;

      const tool = ALERT_COUNTS_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request: requestWithMissingParams,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null when the alertsIndexPattern is undefined', () => {
      const tool = ALERT_COUNTS_TOOL.getTool({
        // alertsIndexPattern is undefined
        esClient,
        replacements,
        request,

        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns a tool instance with the expected tags', () => {
      const tool = ALERT_COUNTS_TOOL.getTool({
        alertsIndexPattern,
        esClient,
        replacements,
        request,

        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['alerts', 'alerts-count']);
    });
  });
});
