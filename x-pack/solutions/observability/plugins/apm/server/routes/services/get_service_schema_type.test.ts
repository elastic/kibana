/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { KIND } from '@kbn/apm-types/es_fields';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { PROCESSOR_EVENT, SERVICE_NAME } from '../../../common/es_fields/apm';
import { getServiceSchemaType } from './get_service_schema_type';

const start = 1_700_000_000_000;
const end = 1_700_000_900_000;

const indices = {
  transaction: 'traces-apm*,apm-*',
  span: 'traces-apm*,apm-*,traces-*.otel-*',
} as unknown as APMIndices;

const baseParams = {
  indices,
  serviceName: 'my-service',
  environment: ENVIRONMENT_ALL_VALUE,
  start,
  end,
};

function makeHitsResponse(totalValue: number) {
  return { hits: { total: { value: totalValue } } };
}

function makeEsClient(counts: { ecs?: number; otel?: number } = {}): ElasticsearchClient {
  const mock = jest.fn();
  mock.mockResolvedValueOnce(makeHitsResponse(counts.ecs ?? 0));
  mock.mockResolvedValueOnce(makeHitsResponse(counts.otel ?? 0));
  return { search: mock } as unknown as ElasticsearchClient;
}

function getSearchCall(esClient: ElasticsearchClient, callIndex: number) {
  return (esClient.search as jest.Mock).mock.calls[callIndex]?.[0];
}

function getFilterClauses(esClient: ElasticsearchClient, callIndex: number) {
  return getSearchCall(esClient, callIndex)?.query?.bool?.filter ?? [];
}

describe('getServiceSchemaType', () => {
  describe('schema type resolution', () => {
    it('returns ecs when ecs query has matches', async () => {
      const esClient = makeEsClient({ ecs: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns ecs when both queries have matches', async () => {
      const esClient = makeEsClient({ ecs: 1, otel: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns otel when only otel query has matches', async () => {
      const esClient = makeEsClient({ ecs: 0, otel: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'otel' });
    });

    it('returns unknown when both queries have no matches', async () => {
      const esClient = makeEsClient({ ecs: 0, otel: 0 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'unknown' });
    });

    it('returns unknown when both indices are empty strings', async () => {
      const emptyIndices = { transaction: '', span: '' } as unknown as APMIndices;
      const esClient = makeEsClient();
      const result = await getServiceSchemaType({ esClient, ...baseParams, indices: emptyIndices });
      expect(result).toEqual({ schema: 'unknown' });
      expect(esClient.search).not.toHaveBeenCalled();
    });
  });

  describe('query structure', () => {
    it('runs two parallel queries', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect((esClient.search as jest.Mock).mock.calls).toHaveLength(2);
    });

    it('searches against the combined transaction and span indices for both queries', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient, 0).index).toBe('traces-apm*,apm-*,traces-*.otel-*');
      expect(getSearchCall(esClient, 1).index).toBe('traces-apm*,apm-*,traces-*.otel-*');
    });

    it('deduplicates when transaction and span indices are identical', async () => {
      const sameIndices = {
        transaction: 'traces-apm*,apm-*',
        span: 'traces-apm*,apm-*',
      } as unknown as APMIndices;
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams, indices: sameIndices });
      expect(getSearchCall(esClient, 0).index).toBe('traces-apm*,apm-*');
      expect(getSearchCall(esClient, 1).index).toBe('traces-apm*,apm-*');
    });

    it('uses size: 0 and terminate_after: 1 for both queries', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient, 0).size).toBe(0);
      expect(getSearchCall(esClient, 0).terminate_after).toBe(1);
      expect(getSearchCall(esClient, 1).size).toBe(0);
      expect(getSearchCall(esClient, 1).terminate_after).toBe(1);
    });

    it('filters by service name in both queries', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getFilterClauses(esClient, 0)).toContainEqual({
        term: { [SERVICE_NAME]: 'my-service' },
      });
      expect(getFilterClauses(esClient, 1)).toContainEqual({
        term: { [SERVICE_NAME]: 'my-service' },
      });
    });

    it('ecs query filters by existence of processor.event', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getFilterClauses(esClient, 0)).toContainEqual({ exists: { field: PROCESSOR_EVENT } });
    });

    it('otel query filters by existence of kind', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getFilterClauses(esClient, 1)).toContainEqual({ exists: { field: KIND } });
    });
  });

  describe('environment filtering', () => {
    it('does not add an environment filter when ENVIRONMENT_ALL is used', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({
        esClient,
        ...baseParams,
        environment: ENVIRONMENT_ALL_VALUE,
      });
      const filters = getFilterClauses(esClient, 0);
      const hasEnvFilter = filters.some(
        (f: Record<string, unknown>) => 'term' in f && 'service.environment' in (f.term as object)
      );
      expect(hasEnvFilter).toBe(false);
    });

    it('adds a term filter for a specific environment', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams, environment: 'production' });
      expect(getFilterClauses(esClient, 0)).toContainEqual({
        term: { 'service.environment': 'production' },
      });
    });
  });
});
