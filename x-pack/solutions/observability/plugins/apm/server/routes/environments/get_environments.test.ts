/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../common/es_fields/apm';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { getEnvironments } from './get_environments';

function createMockApmEventClient({
  unsetCount,
  serviceEnvironments,
  otelEnvironments = [],
}: {
  unsetCount?: number;
  serviceEnvironments: string[];
  otelEnvironments?: string[];
}) {
  const bucketsByField: Record<string, string[]> = {
    [SERVICE_ENVIRONMENT]: serviceEnvironments,
    [RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME]: otelEnvironments,
  };

  return {
    search: async (name: string, params: { aggs?: { items?: { terms?: { field: string } } } }) => {
      if (name === 'has_unset_value_for_fields') {
        return { hits: unsetCount === undefined ? {} : { total: { value: unsetCount } } };
      }

      const field = params.aggs?.items?.terms?.field ?? '';
      return {
        aggregations: {
          items: { buckets: (bucketsByField[field] ?? []).map((key) => ({ key })) },
        },
      };
    },
  } as unknown as APMEventClient;
}

const baseArgs = {
  searchAggregatedTransactions: true,
  size: 10,
  start: 0,
  end: 1,
};

describe('getEnvironments', () => {
  it('handles only unset environments', async () => {
    const apmEventClient = createMockApmEventClient({ unsetCount: 1, serviceEnvironments: [] });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['ENVIRONMENT_NOT_DEFINED']);
  });

  it('handles a missing hit total from the unset-environment check', async () => {
    const apmEventClient = createMockApmEventClient({ serviceEnvironments: ['dev', 'test'] });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['dev', 'test']);
  });

  it('handles no unset environments', async () => {
    const apmEventClient = createMockApmEventClient({
      unsetCount: 0,
      serviceEnvironments: ['dev', 'test'],
    });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['dev', 'test']);
  });

  it('handles unset with other environments', async () => {
    const apmEventClient = createMockApmEventClient({
      unsetCount: 1,
      serviceEnvironments: ['dev', 'test'],
    });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['dev', 'test', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('merges environments from deployment.environment.name with service.environment', async () => {
    const apmEventClient = createMockApmEventClient({
      unsetCount: 0,
      serviceEnvironments: ['production', 'test'],
      otelEnvironments: ['dev', 'production'],
    });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['dev', 'production', 'test']);
  });

  it('returns environments that only exist in deployment.environment.name', async () => {
    const apmEventClient = createMockApmEventClient({
      unsetCount: 0,
      serviceEnvironments: [],
      otelEnvironments: ['production'],
    });
    const result = await getEnvironments({ ...baseArgs, apmEventClient });
    expect(result).toEqual(['production']);
  });
});
