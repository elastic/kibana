/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ENVIRONMENT_ALL_VALUE } from '../../../common/environment_filter_values';
import { SERVICE_ENVIRONMENT } from '../../../common/es_fields/apm';
import { getServiceMixedIngestion } from './get_service_mixed_ingestion';

type SearchMock = jest.Mock<Promise<unknown>>;

const start = 1_700_000_000_000;
const end = 1_700_000_900_000;

const baseParams = {
  serviceName: 'my-service',
  start,
  end,
  environment: ENVIRONMENT_ALL_VALUE,
  kuery: '',
};

function mixedResponse({
  classicCount = 10,
  otelCount = 10,
  classicFrom = start,
  classicTo = end,
  otelFrom = start,
  otelTo = end,
}: {
  classicCount?: number;
  otelCount?: number;
  classicFrom?: number;
  classicTo?: number;
  otelFrom?: number;
  otelTo?: number;
} = {}) {
  return {
    aggregations: {
      ingestion_type: {
        buckets: {
          classic_apm: {
            doc_count: classicCount,
            min_timestamp: { value: classicFrom },
            max_timestamp: { value: classicTo },
          },
          otel_native: {
            doc_count: otelCount,
            min_timestamp: { value: otelFrom },
            max_timestamp: { value: otelTo },
          },
        },
      },
    },
  };
}

function getSearchParams(search: SearchMock, callIndex = 0) {
  return search.mock.calls[callIndex]?.[1];
}

function getFilterClauses(search: SearchMock, callIndex = 0) {
  return getSearchParams(search, callIndex)?.query?.bool?.filter ?? [];
}

describe('getServiceMixedIngestion', () => {
  describe('environment filtering', () => {
    it('does not add an environment filter when ENVIRONMENT_ALL is used', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(mixedResponse());
      const apmEventClient = { search } as unknown as APMEventClient;

      await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      const filters = getFilterClauses(search);
      const hasEnvFilter = filters.some(
        (f: Record<string, unknown>) => 'term' in f && SERVICE_ENVIRONMENT in (f.term as object)
      );
      expect(hasEnvFilter).toBe(false);
    });

    it('adds a term filter for a specific environment', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(mixedResponse());
      const apmEventClient = { search } as unknown as APMEventClient;

      await getServiceMixedIngestion({
        ...baseParams,
        environment: 'production',
        apmEventClient,
      });

      const filters = getFilterClauses(search);
      const envFilter = filters.find(
        (f: Record<string, unknown>) => 'term' in f && SERVICE_ENVIRONMENT in (f.term as object)
      );
      expect(envFilter).toEqual({ term: { [SERVICE_ENVIRONMENT]: 'production' } });
    });
  });

  describe('kuery filtering', () => {
    it('does not add a kql filter when kuery is empty', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(mixedResponse());
      const apmEventClient = { search } as unknown as APMEventClient;

      await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      const filters = getFilterClauses(search);
      expect(filters).toHaveLength(2);
    });

    it('adds a kql filter when kuery is provided', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(mixedResponse());
      const apmEventClient = { search } as unknown as APMEventClient;

      await getServiceMixedIngestion({
        ...baseParams,
        kuery: 'service.name: "my-service"',
        apmEventClient,
      });

      const filters = getFilterClauses(search);
      expect(filters.length).toBeGreaterThan(2);
    });
  });

  describe('response mapping', () => {
    it('returns hasMultipleAgentTypes true when both classic and otel data exist', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(mixedResponse({ classicCount: 5, otelCount: 3 }));
      const apmEventClient = { search } as unknown as APMEventClient;

      const result = await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      expect(result.hasMultipleAgentTypes).toBe(true);
      expect(result.ingestionTimeRanges).toBeDefined();
    });

    it('returns hasMultipleAgentTypes false when only classic data exists', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(mixedResponse({ classicCount: 5, otelCount: 0 }));
      const apmEventClient = { search } as unknown as APMEventClient;

      const result = await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      expect(result.hasMultipleAgentTypes).toBe(false);
      expect(result.ingestionTimeRanges).toBeUndefined();
    });

    it('returns hasMultipleAgentTypes false when only otel data exists', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(mixedResponse({ classicCount: 0, otelCount: 8 }));
      const apmEventClient = { search } as unknown as APMEventClient;

      const result = await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      expect(result.hasMultipleAgentTypes).toBe(false);
      expect(result.ingestionTimeRanges).toBeUndefined();
    });

    it('maps time range values from aggregation buckets', async () => {
      const classicFrom = start + 1000;
      const classicTo = start + 5000;
      const otelFrom = start + 6000;
      const otelTo = end - 1000;

      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(mixedResponse({ classicFrom, classicTo, otelFrom, otelTo }));
      const apmEventClient = { search } as unknown as APMEventClient;

      const result = await getServiceMixedIngestion({ ...baseParams, apmEventClient });

      expect(result.ingestionTimeRanges).toEqual({
        classicApm: { from: classicFrom, to: classicTo },
        otelNative: { from: otelFrom, to: otelTo },
      });
    });
  });
});
