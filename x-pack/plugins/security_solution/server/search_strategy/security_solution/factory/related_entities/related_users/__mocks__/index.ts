/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { IEsSearchResponse } from '@kbn/search-types';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EndpointAppContextService } from '../../../../../../endpoint/endpoint_app_context_services';
import type { EndpointAppContext } from '../../../../../../endpoint/types';
import { RelatedEntitiesQueries } from '../../../../../../../common/search_strategy/security_solution/related_entities';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { allowedExperimentalValues } from '../../../../../../../common/experimental_features';
import { createMockConfig } from '../../../../../../lib/detection_engine/routes/__mocks__';
import type { RelatedUsersRequestOptions } from '../../../../../../../common/api/search_strategy';

export const mockOptions: RelatedUsersRequestOptions = {
  defaultIndex: ['test_indices*'],
  factoryQueryType: RelatedEntitiesQueries.relatedUsers,
  hostName: 'host1',
  from: '2020-09-02T15:17:13.678Z',
  isNewRiskScoreModuleInstalled: false,
};

export const mockSearchStrategyResponse: IEsSearchResponse<unknown> = {
  rawResponse: {
    took: 2,
    timed_out: false,
    _shards: {
      total: 2,
      successful: 2,
      skipped: 1,
      failed: 0,
    },
    hits: {
      max_score: null,
      hits: [],
    },
    aggregations: {
      user_count: {
        value: 2,
      },
      user_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'Danny',
            doc_count: 3,
            ip: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '10.7.58.35',
                  doc_count: 3,
                },
                {
                  key: '10.185.185.41',
                  doc_count: 3,
                },
              ],
            },
          },
          {
            key: 'Aaron',
            doc_count: 6,
            ip: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                {
                  key: '10.7.58.35',
                  doc_count: 6,
                },
                {
                  key: '10.185.185.41',
                  doc_count: 6,
                },
                {
                  key: '10.198.197.106',
                  doc_count: 6,
                },
              ],
            },
          },
        ],
      },
    },
  },
};

export const mockDeps = () => ({
  esClient: elasticsearchServiceMock.createScopedClusterClient(),
  savedObjectsClient: {} as SavedObjectsClientContract,
  endpointContext: {
    logFactory: {
      get: jest.fn(),
    },
    config: jest.fn().mockResolvedValue({}),
    experimentalFeatures: {
      ...allowedExperimentalValues,
    },
    service: {} as EndpointAppContextService,
    serverConfig: createMockConfig(),
  } as EndpointAppContext,
  request: {} as KibanaRequest,
  spaceId: 'test-space',
});

export const expectedDsl = {
  allow_no_indices: true,
  track_total_hits: false,
  body: {
    aggregations: {
      user_count: { cardinality: { field: 'user.name' } },
      user_data: {
        terms: { field: 'user.name', size: 1000 },
        aggs: {
          ip: { terms: { field: 'host.ip', size: 10 } },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { term: { 'host.name': 'host1' } },
          { term: { 'event.category': 'authentication' } },
          { term: { 'event.outcome': 'success' } },
          {
            range: {
              '@timestamp': {
                format: 'strict_date_optional_time',
                gt: '2020-09-02T15:17:13.678Z',
              },
            },
          },
        ],
      },
    },
    size: 0,
  },
  ignore_unavailable: true,
  index: ['test_indices*'],
};

export const mockRelatedHosts = [
  { user: 'Danny', ip: ['10.7.58.35', '10.185.185.41'] },
  {
    user: 'Aaron',
    ip: ['10.7.58.35', '10.185.185.41', '10.198.197.106'],
  },
];
