/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { IEsSearchResponse } from '@kbn/data-plugin/common';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { EndpointAppContextService } from '../../../../../../endpoint/endpoint_app_context_services';
import type { EndpointAppContext } from '../../../../../../endpoint/types';
import { RelatedEntitiesQueries } from '../../../../../../../common/search_strategy/security_solution/related_entities';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { allowedExperimentalValues } from '../../../../../../../common/experimental_features';
import { createMockConfig } from '../../../../../../lib/detection_engine/routes/__mocks__';
import type { RelatedHostsRequestOptions } from '../../../../../../../common/api/search_strategy';

export const mockOptions: RelatedHostsRequestOptions = {
  defaultIndex: ['test_indices*'],
  factoryQueryType: RelatedEntitiesQueries.relatedHosts,
  userName: 'user1',
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
      host_count: {
        value: 2,
      },
      host_data: {
        doc_count_error_upper_bound: 0,
        sum_other_doc_count: 0,
        buckets: [
          {
            key: 'Host-2qia8v8mzl',
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
          {
            key: 'Host-ly6nig20ty',
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
      host_count: { cardinality: { field: 'host.name' } },
      host_data: {
        terms: { field: 'host.name', size: 1000 },
        aggs: {
          ip: { terms: { field: 'host.ip', size: 10 } },
        },
      },
    },
    query: {
      bool: {
        filter: [
          { term: { 'user.name': 'user1' } },
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
  { host: 'Host-2qia8v8mzl', ip: ['10.7.58.35', '10.185.185.41', '10.198.197.106'] },
  {
    host: 'Host-ly6nig20ty',
    ip: ['10.7.58.35', '10.185.185.41', '10.198.197.106'],
  },
];
