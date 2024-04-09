/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { DynamicTool } from '@langchain/core/tools';
import { omit } from 'lodash/fp';

import { ALERT_COUNTS_TOOL } from './alert_counts_tool';
import type { RetrievalQAChain } from 'langchain/chains';
import type { ExecuteConnectorRequestBody } from '@kbn/elastic-assistant-common/impl/schemas/actions_connector/post_actions_connector_execute_route.gen';

describe('AlertCountsTool', () => {
  const alertsIndexPattern = 'alerts-index';
  const esClient = {
    search: jest.fn().mockResolvedValue({}),
  } as unknown as ElasticsearchClient;
  const replacements = { key: 'value' };
  const request = {
    body: {
      isEnabledKnowledgeBase: false,
      alertsIndexPattern: '.alerts-security.alerts-default',
      allow: ['@timestamp', 'cloud.availability_zone', 'user.name'],
      allowReplacement: ['user.name'],
      replacements,
      size: 20,
    },
  } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
  const isEnabledKnowledgeBase = true;
  const chain = {} as unknown as RetrievalQAChain;
  const modelExists = true;
  const rest = {
    isEnabledKnowledgeBase,
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
          isEnabledKnowledgeBase: false,
          alertsIndexPattern: '.alerts-security.alerts-default',
          size: 20,
        },
      } as unknown as KibanaRequest<unknown, unknown, ExecuteConnectorRequestBody>;
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
        aggs: {
          kibanaAlertSeverity: {
            terms: {
              field: 'kibana.alert.severity',
            },
            aggs: {
              kibanaAlertWorkflowStatus: {
                terms: {
                  field: 'kibana.alert.workflow_status',
                },
              },
            },
          },
        },
        index: ['alerts-index'],
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
                  ],
                  should: [],
                  must: [],
                  must_not: [
                    {
                      exists: {
                        field: 'kibana.alert.building_block_type',
                      },
                    },
                  ],
                },
              },
              {
                range: {
                  '@timestamp': {
                    gte: 'now-24h',
                    lte: 'now',
                  },
                },
              },
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
        ExecuteConnectorRequestBody
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
