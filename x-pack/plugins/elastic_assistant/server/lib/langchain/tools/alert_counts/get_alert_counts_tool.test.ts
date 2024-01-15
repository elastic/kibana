/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { DynamicTool } from 'langchain/tools';
import { omit } from 'lodash/fp';

import { getAlertCountsTool } from './get_alert_counts_tool';
import type { RequestBody } from '../../types';

describe('getAlertCountsTool', () => {
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns a `DynamicTool` with a `func` that calls `esClient.search()` with the expected query', async () => {
    const tool: DynamicTool = getAlertCountsTool({
      alertsIndexPattern,
      esClient,
      replacements,
      request,
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
      RequestBody
    >;

    const tool = getAlertCountsTool({
      alertsIndexPattern,
      esClient,
      replacements,
      request: requestWithMissingParams,
    });

    expect(tool).toBeNull();
  });

  it('returns null when the alertsIndexPattern is undefined', () => {
    const tool = getAlertCountsTool({
      // alertsIndexPattern is undefined
      esClient,
      replacements,
      request,
    });

    expect(tool).toBeNull();
  });

  it('returns a tool instance with the expected tags', () => {
    const tool = getAlertCountsTool({
      alertsIndexPattern,
      esClient,
      replacements,
      request,
    }) as DynamicTool;

    expect(tool.tags).toEqual(['alerts', 'alerts-count']);
  });
});
