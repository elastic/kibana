/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getEnvironments } from './get_environments';

describe('useEnvronmentsFetcher', () => {
  it('handles only unset environments', async () => {
    const mockResponse: Record<string, object> = {
      has_unset_value_for_field: {
        hits: {
          total: {
            value: 1,
          },
        },
      },
      get_suggestions_with_terms_aggregation: {
        aggregations: {
          items: {
            buckets: [],
          },
        },
      },
    };

    const mockApmEventClient = {
      search: async (name: string, _: any) => {
        return mockResponse[name];
      },
    } as unknown as APMEventClient;

    const result = await getEnvironments({
      searchAggregatedTransactions: true,
      apmEventClient: mockApmEventClient,
      size: 10,
      start: 0,
      end: 1,
    });
    expect(result).toEqual(['ENVIRONMENT_NOT_DEFINED']);
  });
  it('handles undefined unsetValuesForField', async () => {
    const mockResponse: Record<string, object> = {
      has_unset_value_for_field: {
        hits: {},
      },
      get_suggestions_with_terms_aggregation: {
        aggregations: {
          items: {
            buckets: [{ key: 'dev' }, { key: 'test' }],
          },
        },
      },
    };

    const mockApmEventClient = {
      search: async (name: string, _: any) => {
        return mockResponse[name];
      },
    } as unknown as APMEventClient;

    const result = await getEnvironments({
      searchAggregatedTransactions: true,
      apmEventClient: mockApmEventClient,
      size: 10,
      start: 0,
      end: 1,
    });
    expect(result).toEqual(['dev', 'test']);
  });
  it('handles no unset environments', async () => {
    const mockResponse: Record<string, object> = {
      has_unset_value_for_field: {
        hits: {
          total: {
            value: 0,
          },
        },
      },
      get_suggestions_with_terms_aggregation: {
        aggregations: {
          items: {
            buckets: [{ key: 'dev' }, { key: 'test' }],
          },
        },
      },
    };

    const mockApmEventClient = {
      search: async (name: string, _: any) => {
        return mockResponse[name];
      },
    } as unknown as APMEventClient;

    const result = await getEnvironments({
      searchAggregatedTransactions: true,
      apmEventClient: mockApmEventClient,
      size: 10,
      start: 0,
      end: 1,
    });
    expect(result).toEqual(['dev', 'test']);
  });
  it('handles unset with other environments', async () => {
    const mockResponse: Record<string, object> = {
      has_unset_value_for_field: {
        hits: {
          total: {
            value: 1,
          },
        },
      },
      get_suggestions_with_terms_aggregation: {
        aggregations: {
          items: {
            buckets: [{ key: 'dev' }, { key: 'test' }],
          },
        },
      },
    };

    const mockApmEventClient = {
      search: async (name: string, _: any) => {
        return mockResponse[name];
      },
    } as unknown as APMEventClient;

    const result = await getEnvironments({
      searchAggregatedTransactions: true,
      apmEventClient: mockApmEventClient,
      size: 10,
      start: 0,
      end: 1,
    });
    expect(result).toEqual(['dev', 'test', 'ENVIRONMENT_NOT_DEFINED']);
  });
});
