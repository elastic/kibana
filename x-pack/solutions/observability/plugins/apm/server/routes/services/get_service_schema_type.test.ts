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

function makeEsClient(aggCounts: { ecs?: number; otel?: number } = {}): ElasticsearchClient {
  return {
    search: jest.fn().mockResolvedValue({
      hits: { total: { value: 0 } },
      aggregations: {
        ecs: { doc_count: aggCounts.ecs ?? 0 },
        otel: { doc_count: aggCounts.otel ?? 0 },
      },
    }),
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
    it('returns ecs when ecs agg has matches', async () => {
      const esClient = makeEsClient({ ecs: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns ecs when both ecs and otel aggs have matches', async () => {
      const esClient = makeEsClient({ ecs: 1, otel: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'ecs' });
    });

    it('returns otel when only otel agg has matches', async () => {
      const esClient = makeEsClient({ otel: 1 });
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'otel' });
    });

    it('returns unknown when both aggs have no matches', async () => {
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

    it('returns unknown when aggregations are absent', async () => {
      const esClient = {
        search: jest.fn().mockResolvedValue({ hits: { total: { value: 0 } } }),
      } as unknown as ElasticsearchClient;
      const result = await getServiceSchemaType({ esClient, ...baseParams });
      expect(result).toEqual({ schema: 'unknown' });
    });
  });

  describe('query structure', () => {
    it('searches against the combined transaction and span indices', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient).index).toBe('traces-apm*,apm-*,traces-*.otel-*');
    });

    it('deduplicates when transaction and span indices are identical', async () => {
      const sameIndices = {
        transaction: 'traces-apm*,apm-*',
        span: 'traces-apm*,apm-*',
      } as unknown as APMIndices;
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams, indices: sameIndices });
      expect(getSearchCall(esClient).index).toBe('traces-apm*,apm-*');
    });

    it('uses size: 0', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient).size).toBe(0);
    });

    it('filters by service name', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      const filters = getFilterClauses(esClient);
      expect(filters).toContainEqual({ term: { [SERVICE_NAME]: 'my-service' } });
    });

    it('includes ecs agg probing for processor.event', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient).aggs?.ecs).toEqual({
        filter: { exists: { field: PROCESSOR_EVENT } },
      });
    });

    it('includes otel agg probing for kind', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams });
      expect(getSearchCall(esClient).aggs?.otel).toEqual({
        filter: { exists: { field: KIND } },
      });
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
      const filters = getFilterClauses(esClient);
      const hasEnvFilter = filters.some(
        (f: Record<string, unknown>) => 'term' in f && 'service.environment' in (f.term as object)
      );
      expect(hasEnvFilter).toBe(false);
    });

    it('adds a term filter for a specific environment', async () => {
      const esClient = makeEsClient();
      await getServiceSchemaType({ esClient, ...baseParams, environment: 'production' });
      const filters = getFilterClauses(esClient);
      expect(filters).toContainEqual({ term: { 'service.environment': 'production' } });
    });
  });
});
