/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APMEventESSearchRequestParams, alertingEsClient } from './alerting_es_client';
import { RuleExecutorServices } from '@kbn/alerting-plugin/server';
import { ElasticsearchClient, IUiSettingsClient } from '@kbn/core/server';
import { ESSearchResponse } from '@kbn/es-types';

describe('alertingEsClient', () => {
  let scopedClusterClientMock: jest.Mocked<{
    asCurrentUser: jest.Mocked<ElasticsearchClient>;
  }>;

  let uiSettingsClientMock: jest.Mocked<IUiSettingsClient>;

  beforeEach(() => {
    scopedClusterClientMock = {
      asCurrentUser: {
        search: jest.fn(),
      } as unknown as jest.Mocked<ElasticsearchClient>,
    };

    uiSettingsClientMock = {
      get: jest.fn(),
    } as unknown as jest.Mocked<IUiSettingsClient>;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should call search with filters containing excluded data tiers', async () => {
    const excludedDataTiers = ['data_warm', 'data_cold'];
    uiSettingsClientMock.get.mockResolvedValue(excludedDataTiers);

    const params = {
      body: {
        size: 10,
        track_total_hits: true,
        query: {
          match: { field: 'value' },
        },
      },
    };

    scopedClusterClientMock.asCurrentUser.search.mockResolvedValue({
      hits: {
        total: { value: 1, relation: 'eq' },
        hits: [{ _source: {}, _index: '' }],
        max_score: 1,
      },
      took: 1,
      _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
      timed_out: false,
    } as unknown as ESSearchResponse<unknown, typeof params>);

    await alertingEsClient({
      scopedClusterClient: scopedClusterClientMock as unknown as RuleExecutorServices<
        never,
        never,
        never
      >['scopedClusterClient'],
      uiSettingsClient: uiSettingsClientMock,
      params,
    });

    const searchParams = scopedClusterClientMock.asCurrentUser.search.mock
      .calls[0][0] as APMEventESSearchRequestParams;
    expect(searchParams?.body?.query?.bool).toEqual({
      filter: { bool: { must_not: [{ terms: { _tier: ['data_warm', 'data_cold'] } }] } },
      must: [{ match: { field: 'value' } }],
    });
  });
});
