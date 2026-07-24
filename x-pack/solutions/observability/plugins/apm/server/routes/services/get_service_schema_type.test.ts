/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { PROCESSOR_EVENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { getServiceSchemaType } from './get_service_schema_type';

const start = 1_700_000_000_000;
const end = 1_700_000_900_000;

const indices = {
  transaction: 'traces-apm*,apm-*',
} as APMIndices;

const baseParams = {
  indices,
  serviceName: 'my-service',
  environment: ENVIRONMENT_ALL_VALUE,
  start,
  end,
};

function makeEsClient(total: number | { value: number } | undefined): ElasticsearchClient {
  return {
    search: jest.fn().mockResolvedValue({ hits: { total } }),
  } as unknown as ElasticsearchClient;
}

function getSearchCall(esClient: ElasticsearchClient) {
  return (esClient.search as jest.Mock).mock.calls[0][0];
}

function getFilterClauses(esClient: ElasticsearchClient) {
  return getSearchCall(esClient)?.query?.bool?.filter ?? [];
}

describe('getServiceSchemaType', () => {
  describe('schema type resolution', () => {
    it('returns ecs when hits.total is an object with value > 0', async () => {
      const esClient = makeEsClient({ value: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns otel when hits.total is an object with value 0', async () => {
      const esClient = makeEsClient({ value: 0 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'otel' });
    });

    it('returns ecs when hits.total is a number > 0', async () => {
      const esClient = makeEsClient(1);
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns otel when hits.total is a number 0', async () => {
      const esClient = makeEsClient(0);
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'otel' });
    });

    it('returns otel when hits.total is undefined', async () => {
      const esClient = makeEsClient(undefined);
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'otel' });
    });
  });

  describe('query structure', () => {
    it('searches against the transaction index', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient).index).toBe(indices.transaction);
    });

    it('uses track_total_hits: 1 and size: 0 for a lightweight existence check', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({ esClient, ...baseParams });
      const call = getSearchCall(esClient);
      expect(call.track_total_hits).toBe(1);
      expect(call.size).toBe(0);
    });

    it('filters by service name', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({ esClient, ...baseParams });
      const filters = getFilterClauses(esClient);
      expect(filters).toContainEqual({ term: { [SERVICE_NAME]: 'my-service' } });
    });

    it('filters by processor.event: transaction', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({ esClient, ...baseParams });
      const filters = getFilterClauses(esClient);
      expect(filters).toContainEqual({ term: { [PROCESSOR_EVENT]: 'transaction' } });
    });
  });

  describe('environment filtering', () => {
    it('does not add an environment filter when ENVIRONMENT_ALL is used', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({
        esClient,
        ...baseParams,
        environment: ENVIRONMENT_ALL_VALUE,
      });
      const filters = getFilterClauses(esClient);
      const hasEnvFilter = filters.some(
        (f: Record<string, unknown>) => 'term' in f && 'service.environment' in (f.term as object)
      );
      expect(hasEnvFilter).toBe(false);
    });

    it('adds a term filter for a specific environment', async () => {
      const esClient = makeEsClient({ value: 0 });
      await getServiceSchemaType({ esClient, ...baseParams, environment: 'production' });
      const filters = getFilterClauses(esClient);
      expect(filters).toContainEqual({ term: { 'service.environment': 'production' } });
    });
  });
});
