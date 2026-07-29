/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getUnifiedEnvironments } from './get_unified_environments';

const indices = {
  transaction: 'traces-apm*',
  span: 'traces-otel*',
} as unknown as APMIndices;

const baseArgs = {
  indices,
  serviceName: 'my-service',
  start: 0,
  end: 1,
  size: 100,
};

function makeEsClient(buckets: Array<{ key: string }>, missingCount: number): ElasticsearchClient {
  return {
    search: async () => ({
      aggregations: {
        environments: { buckets },
        missing_environments: { doc_count: missingCount },
      },
    }),
  } as unknown as ElasticsearchClient;
}

describe('getUnifiedEnvironments', () => {
  it('returns environments from APM-processed data', async () => {
    const esClient = makeEsClient([{ key: 'production' }, { key: 'staging' }], 0);
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs });
    expect(result).toEqual(['production', 'staging']);
  });

  it('returns environments from unprocessed OTel data', async () => {
    const esClient = makeEsClient([{ key: 'dev' }], 0);
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs });
    expect(result).toEqual(['dev']);
  });

  it('appends ENVIRONMENT_NOT_DEFINED when docs have no service.environment', async () => {
    const esClient = makeEsClient([{ key: 'production' }], 3);
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs });
    expect(result).toEqual(['production', 'ENVIRONMENT_NOT_DEFINED']);
  });

  it('returns only ENVIRONMENT_NOT_DEFINED when all docs lack service.environment', async () => {
    const esClient = makeEsClient([], 5);
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs });
    expect(result).toEqual(['ENVIRONMENT_NOT_DEFINED']);
  });

  it('returns empty array when there are no matching documents', async () => {
    const esClient = makeEsClient([], 0);
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs });
    expect(result).toEqual([]);
  });

  it('returns empty array without searching when both indices are empty strings', async () => {
    const searchSpy = jest.fn();
    const esClient = { search: searchSpy } as unknown as ElasticsearchClient;
    const emptyIndices = { transaction: '', span: '' } as unknown as APMIndices;
    const result = await getUnifiedEnvironments({ esClient, ...baseArgs, indices: emptyIndices });
    expect(result).toEqual([]);
    expect(searchSpy).not.toHaveBeenCalled();
  });
});
