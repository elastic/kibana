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

import { OPEN_ALERTS_TOOL } from './get_open_alerts_tool';
import { mockAlertsFieldsApi } from '@kbn/elastic-assistant-plugin/server/__mocks__/alerts';
import type { RequestBody } from '@kbn/elastic-assistant-plugin/server/lib/langchain/types';
import { MAX_SIZE } from './helpers';
import type { RetrievalQAChain } from 'langchain/chains';

describe('getOpenAlertsTool', () => {
  describe('getTool', () => {
    const alertsIndexPattern = 'alerts-index';
    const esClient = {
      search: jest.fn().mockResolvedValue(mockAlertsFieldsApi),
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

    it('returns a `DynamicTool` with a `func` that calls `esClient.search()` with the expected query', async () => {
      const tool: DynamicTool = OPEN_ALERTS_TOOL.getTool({
        alertsIndexPattern,
        allow: request.body.allow,
        allowReplacement: request.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request,
        size: request.body.size,
        ...rest,
      }) as DynamicTool;

      await tool.func('');

      expect(esClient.search).toHaveBeenCalledWith({
        allow_no_indices: true,
        body: {
          _source: false,
          fields: [
            {
              field: '@timestamp',
              include_unmapped: true,
            },
            {
              field: 'cloud.availability_zone',
              include_unmapped: true,
            },
            {
              field: 'user.name',
              include_unmapped: true,
            },
          ],
          query: {
            bool: {
              filter: [
                {
                  bool: {
                    filter: [
                      {
                        bool: {
                          should: [
                            {
                              match_phrase: {
                                'kibana.alert.workflow_status': 'open',
                              },
                            },
                            {
                              match_phrase: {
                                'kibana.alert.workflow_status': 'acknowledged',
                              },
                            },
                          ],
                          minimum_should_match: 1,
                        },
                      },
                      {
                        range: {
                          '@timestamp': {
                            format: 'strict_date_optional_time',
                            gte: 'now-1d/d',
                            lte: 'now/d',
                          },
                        },
                      },
                    ],
                    must: [],
                    must_not: [
                      {
                        exists: {
                          field: 'kibana.alert.building_block_type',
                        },
                      },
                    ],
                    should: [],
                  },
                },
              ],
            },
          },
          runtime_mappings: {},
          size: 20,
          sort: [
            {
              'kibana.alert.risk_score': {
                order: 'desc',
              },
            },
            {
              '@timestamp': {
                order: 'desc',
              },
            },
          ],
        },
        ignore_unavailable: true,
        index: ['alerts-index'],
      });
    });

    it('returns null when the request is missing required anonymization parameters', () => {
      const requestWithMissingParams = omit('body.allow', request) as unknown as KibanaRequest<
        unknown,
        unknown,
        RequestBody
      >;

      const tool = OPEN_ALERTS_TOOL.getTool({
        alertsIndexPattern,
        allow: requestWithMissingParams.body.allow,
        allowReplacement: requestWithMissingParams.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request: requestWithMissingParams,
        size: requestWithMissingParams.body.size,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null when alertsIndexPattern is undefined', () => {
      const tool = OPEN_ALERTS_TOOL.getTool({
        // alertsIndexPattern is undefined
        allow: request.body.allow,
        allowReplacement: request.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request,
        size: request.body.size,
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns null when size is undefined', () => {
      const tool = OPEN_ALERTS_TOOL.getTool({
        alertsIndexPattern,
        allow: request.body.allow,
        allowReplacement: request.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request,
        ...rest,
        // size is undefined
      });

      expect(tool).toBeNull();
    });

    it('returns null when size out of range', () => {
      const tool = OPEN_ALERTS_TOOL.getTool({
        alertsIndexPattern,
        allow: request.body.allow,
        allowReplacement: request.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request,
        size: MAX_SIZE + 1, // <-- size is out of range
        ...rest,
      });

      expect(tool).toBeNull();
    });

    it('returns a tool instance with the expected tags', () => {
      const tool = OPEN_ALERTS_TOOL.getTool({
        alertsIndexPattern,
        allow: request.body.allow,
        allowReplacement: request.body.allowReplacement,
        esClient,
        onNewReplacements: jest.fn(),
        replacements,
        request,
        size: request.body.size,
        ...rest,
      }) as DynamicTool;

      expect(tool.tags).toEqual(['alerts', 'open-alerts']);
    });
  });
});
