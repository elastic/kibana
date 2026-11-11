/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { APMEventClient } from '@kbn/apm-data-access-plugin/server';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-data-access-plugin/common';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import type { EnhancedServiceStatsOptions, ServiceStatsSource } from './get_enhanced_service_stats';
import { getEnhancedServiceStats } from './get_enhanced_service_stats';

type SearchMock = jest.Mock<Promise<unknown>>;

const START = 1_700_000_000_000;
const FIFTEEN_MINUTES = 15 * 60_000;

const SERVICE_METRICS_10M: ServiceStatsSource = {
  documentType: ApmDocumentType.ServiceTransactionMetric,
  rollupInterval: RollupInterval.TenMinutes,
  useDurationSummary: true,
};

function makeOptions(
  overrides: Partial<EnhancedServiceStatsOptions> = {}
): EnhancedServiceStatsOptions {
  return {
    apmEventClient: {} as APMEventClient,
    config: {} as EnhancedServiceStatsOptions['config'],
    environment: ENVIRONMENT_ALL.value,
    start: START,
    end: START + FIFTEEN_MINUTES,
    logger: { debug: jest.fn() } as unknown as EnhancedServiceStatsOptions['logger'],
    maxNumberOfServices: 50,
    searchAggregatedTransactions: true,
    source: SERVICE_METRICS_10M,
    ...overrides,
  };
}

interface TypeBucketFixture {
  key: string;
  docCount: number;
  latency: number | null;
  successful: number;
  successfulOrFailed: number;
}

const typeBucket = ({
  key,
  docCount,
  latency,
  successful,
  successfulOrFailed,
}: TypeBucketFixture) => ({
  key,
  doc_count: docCount,
  latency: { value: latency },
  successful: { value: successful },
  successful_or_failed: { value: successfulOrFailed },
});

interface ServiceBucketFixture {
  name: string;
  agentName?: string | null;
  telemetrySdkLanguage?: string | null;
  telemetrySdkName?: string | null;
  defaultType?: TypeBucketFixture;
  topType?: TypeBucketFixture;
}

function aggResponse(services: ServiceBucketFixture[]) {
  return {
    aggregations: {
      services: {
        buckets: services.map(
          ({
            name,
            agentName = 'java',
            telemetrySdkLanguage = null,
            telemetrySdkName = null,
            defaultType,
            topType,
          }) => ({
            key: name,
            agent: {
              top: [
                {
                  sort: [START],
                  metrics: {
                    'agent.name': agentName,
                    'telemetry.sdk.language': telemetrySdkLanguage,
                    'telemetry.sdk.name': telemetrySdkName,
                  },
                },
              ],
            },
            default_type: { buckets: defaultType ? [typeBucket(defaultType)] : [] },
            top_type: { buckets: topType ? [typeBucket(topType)] : [] },
          })
        ),
      },
    },
  };
}

interface SearchParams {
  apm: { sources: Array<{ documentType: ApmDocumentType; rollupInterval: RollupInterval }> };
  aggs: {
    services: {
      aggs: Record<
        'agent' | 'default_type' | 'top_type',
        {
          terms?: { field: string; include?: string[]; size: number };
          top_metrics?: { metrics: Array<{ field: string }> };
          aggs?: Record<string, Record<string, { field?: string }>>;
        }
      >;
    };
  };
}

function getSearchCall(search: SearchMock, callIndex: number) {
  const [operationName, params] = search.mock.calls[callIndex] as [string, SearchParams];
  return { operationName, params };
}

const REQUEST = {
  key: 'request',
  docCount: 150,
  latency: 50_000,
  successful: 135,
  successfulOrFailed: 150,
};

const MESSAGING = {
  key: 'messaging',
  docCount: 750,
  latency: 2_000,
  successful: 750,
  successfulOrFailed: 750,
};

describe('getEnhancedServiceStats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('request', () => {
    it('queries the source it is given', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));

      await getEnhancedServiceStats(
        makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
      );

      expect(getSearchCall(search, 0).params.apm.sources).toEqual([
        {
          documentType: ApmDocumentType.ServiceTransactionMetric,
          rollupInterval: RollupInterval.TenMinutes,
        },
      ]);
    });

    it('reads the agent with top_metrics and the main type from two size-1 terms', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));

      await getEnhancedServiceStats(
        makeOptions({ apmEventClient: { search } as unknown as APMEventClient })
      );

      const { aggs } = getSearchCall(search, 0).params.aggs.services;
      expect(aggs.agent.top_metrics?.metrics).toEqual([
        { field: 'agent.name' },
        { field: 'telemetry.sdk.language' },
        { field: 'telemetry.sdk.name' },
      ]);
      expect(aggs.default_type.terms).toEqual({
        field: 'transaction.type',
        include: ['request', 'page-load', 'mobile'],
        size: 1,
      });
      expect(aggs.top_type.terms).toEqual({ field: 'transaction.type', size: 1 });
    });

    it.each<[ServiceStatsSource, string, string]>([
      [SERVICE_METRICS_10M, 'transaction.duration.summary', 'value_count'],
      [
        { ...SERVICE_METRICS_10M, useDurationSummary: false },
        'transaction.duration.histogram',
        'value_count',
      ],
      [
        {
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.OneMinute,
          useDurationSummary: true,
        },
        'transaction.duration.summary',
        'filter',
      ],
      [
        {
          documentType: ApmDocumentType.TransactionEvent,
          rollupInterval: RollupInterval.None,
          useDurationSummary: false,
        },
        'transaction.duration.us',
        'filter',
      ],
    ])(
      'reads latency and outcomes for %j from %s and a %s aggregation',
      async (source, latencyField, outcomeAggregation) => {
        const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));

        await getEnhancedServiceStats(
          makeOptions({ apmEventClient: { search } as unknown as APMEventClient, source })
        );

        const { aggs } = getSearchCall(search, 0).params.aggs.services;
        [aggs.default_type, aggs.top_type].forEach((typeAggregation) => {
          expect(typeAggregation.aggs?.latency.avg.field).toBe(latencyField);
          expect(Object.keys(typeAggregation.aggs?.successful_or_failed ?? {})).toEqual([
            outcomeAggregation,
          ]);
        });
      }
    );
  });

  describe('response', () => {
    const getServices = async (services: ServiceBucketFixture[], environment?: string) => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse(services));
      return getEnhancedServiceStats(
        makeOptions({
          apmEventClient: { search } as unknown as APMEventClient,
          ...(environment ? { environment } : {}),
        })
      );
    };

    it('uses the default type even when another type is busier', async () => {
      const [service] = await getServices([
        { name: 'backend', defaultType: REQUEST, topType: MESSAGING },
      ]);

      expect(service).toEqual({
        'service.name': 'backend',
        'agent.name': 'java',
        'service.environment': null,
        stats: {
          transactionType: 'request',
          throughput: 10,
          failedTransactionRate: 0.1,
          latency: 50_000,
          requestCount: 150,
        },
      });
    });

    it('uses the busiest type when there is no default type', async () => {
      const [service] = await getServices([{ name: 'worker', topType: MESSAGING }]);

      expect(service.stats).toEqual({
        transactionType: 'messaging',
        throughput: 50,
        failedTransactionRate: 0,
        latency: 2_000,
        requestCount: 750,
      });
    });

    it('sets no failed transaction rate when no transaction has a known outcome', async () => {
      const [service] = await getServices([
        {
          name: 'unknown-outcome',
          defaultType: { ...REQUEST, successful: 0, successfulOrFailed: 0 },
        },
      ]);

      expect(service.stats?.failedTransactionRate).toBeNull();
    });

    it('leaves the stats out when the service has no transaction types', async () => {
      const [service] = await getServices([{ name: 'no-types' }]);

      expect(service).not.toHaveProperty('stats');
    });

    it('builds the agent name from the OpenTelemetry SDK fields when agent.name is missing', async () => {
      const [service] = await getServices([
        {
          name: 'otel',
          agentName: null,
          telemetrySdkLanguage: 'java',
          telemetrySdkName: 'opentelemetry',
          defaultType: REQUEST,
        },
      ]);

      expect(service['agent.name']).toBe('opentelemetry/java');
    });

    it('sets an empty agent name when there is none', async () => {
      const [service] = await getServices([{ name: 'unknown', agentName: null }]);

      expect(service['agent.name']).toBe('');
    });

    it('sets the environment when one is selected', async () => {
      const [service] = await getServices(
        [{ name: 'backend', defaultType: REQUEST }],
        'production'
      );

      expect(service['service.environment']).toBe('production');
    });
  });

  describe('retry against transaction metrics', () => {
    it('keeps the rollup interval when service transaction metrics return nothing for a kuery', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(aggResponse([]))
        .mockResolvedValueOnce(aggResponse([{ name: 'backend', defaultType: REQUEST }]));

      const services = await getEnhancedServiceStats(
        makeOptions({
          apmEventClient: { search } as unknown as APMEventClient,
          kuery: 'transaction.name: "GET /"',
        })
      );

      expect(search).toHaveBeenCalledTimes(2);
      expect(getSearchCall(search, 1).operationName).toBe(
        'get_enhanced_service_stats_for_service_map_fallback'
      );
      expect(getSearchCall(search, 1).params.apm.sources).toEqual([
        {
          documentType: ApmDocumentType.TransactionMetric,
          rollupInterval: RollupInterval.TenMinutes,
        },
      ]);
      expect(
        Object.keys(
          getSearchCall(search, 1).params.aggs.services.aggs.default_type.aggs?.successful ?? {}
        )
      ).toEqual(['filter']);
      expect(services).toHaveLength(1);
    });

    it('retries when only the filter bar query is set', async () => {
      const search: SearchMock = jest
        .fn()
        .mockResolvedValueOnce(aggResponse([]))
        .mockResolvedValueOnce(aggResponse([]));

      await getEnhancedServiceStats(
        makeOptions({
          apmEventClient: { search } as unknown as APMEventClient,
          esQuery: {
            bool: {
              filter: [{ term: { 'transaction.name': 'GET /' } }],
              must: [],
              should: [],
              must_not: [],
            },
          },
        })
      );

      expect(search).toHaveBeenCalledTimes(2);
    });

    it('does not retry without a kuery or filter', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));

      await getEnhancedServiceStats(
        makeOptions({ apmEventClient: { search } as unknown as APMEventClient, kuery: '  ' })
      );

      expect(search).toHaveBeenCalledTimes(1);
    });

    it('does not retry when the source is already transaction metrics', async () => {
      const search: SearchMock = jest.fn().mockResolvedValueOnce(aggResponse([]));

      await getEnhancedServiceStats(
        makeOptions({
          apmEventClient: { search } as unknown as APMEventClient,
          kuery: 'transaction.name: "GET /"',
          source: { ...SERVICE_METRICS_10M, documentType: ApmDocumentType.TransactionMetric },
        })
      );

      expect(search).toHaveBeenCalledTimes(1);
    });
  });
});
