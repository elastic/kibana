/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { setupRequest } from '../../lib/helpers/setup_request';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getMetadataForBackend } from './get_metadata_for_backend';
import { getLatencyChartsForBackend } from './get_latency_charts_for_backend';
import { getTopBackends } from './get_top_backends';
import { getUpstreamServicesForBackend } from './get_upstream_services_for_backend';
import { getThroughputChartsForBackend } from './get_throughput_charts_for_backend';
import { getErrorRateChartsForBackend } from './get_error_rate_charts_for_backend';
import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { offsetRt } from '../../../common/offset_rt';

const topBackendsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/top_backends',
  params: t.intersection([
    t.type({
      query: t.intersection([
        rangeRt,
        environmentRt,
        kueryRt,
        t.type({ numBuckets: toNumberRt }),
      ]),
    }),
    t.partial({
      query: offsetRt,
    }),
  ]),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    backends: Array<{
      currentStats: {
        latency: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        throughput: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        errorRate: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        totalTime: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
      } & { impact: number };
      previousStats:
        | ({
            latency: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            throughput: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            errorRate: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            totalTime: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
          } & { impact: number })
        | null;
      location: import('./../../../common/connections').Node;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const { environment, offset, numBuckets, kuery, start, end } =
      resources.params.query;

    const opts = { setup, start, end, numBuckets, environment, kuery };

    const [currentBackends, previousBackends] = await Promise.all([
      getTopBackends(opts),
      offset ? getTopBackends({ ...opts, offset }) : Promise.resolve([]),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      backends: currentBackends.map((backend) => {
        const { stats, ...rest } = backend;
        const prev = previousBackends.find(
          (item): boolean => item.location.id === backend.location.id
        );
        return {
          ...rest,
          currentStats: stats,
          previousStats: prev?.stats ?? null,
        };
      }),
    };
  },
});

const upstreamServicesForBackendRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/upstream_services',
  params: t.intersection([
    t.type({
      query: t.intersection([
        t.type({ backendName: t.string }),
        rangeRt,
        t.type({ numBuckets: toNumberRt }),
      ]),
    }),
    t.partial({
      query: t.intersection([environmentRt, offsetRt, kueryRt]),
    }),
  ]),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    services: Array<{
      currentStats: {
        latency: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        throughput: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        errorRate: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
        totalTime: {
          value: number | null;
          timeseries: Array<import('./../../../typings/timeseries').Coordinate>;
        };
      } & { impact: number };
      previousStats:
        | ({
            latency: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            throughput: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            errorRate: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
            totalTime: {
              value: number | null;
              timeseries: Array<
                import('./../../../typings/timeseries').Coordinate
              >;
            };
          } & { impact: number })
        | null;
      location: import('./../../../common/connections').Node;
    }>;
  }> => {
    const setup = await setupRequest(resources);
    const {
      query: {
        backendName,
        environment,
        offset,
        numBuckets,
        kuery,
        start,
        end,
      },
    } = resources.params;

    const opts = {
      backendName,
      setup,
      start,
      end,
      numBuckets,
      environment,
      kuery,
    };

    const [currentServices, previousServices] = await Promise.all([
      getUpstreamServicesForBackend(opts),
      offset
        ? getUpstreamServicesForBackend({ ...opts, offset })
        : Promise.resolve([]),
    ]);

    return {
      services: currentServices.map(
        (
          service
        ): Omit<ConnectionStatsItemWithImpact, 'stats'> & {
          currentStats: ConnectionStatsItemWithImpact['stats'];
          previousStats: ConnectionStatsItemWithImpact['stats'] | null;
        } => {
          const { stats, ...rest } = service;
          const prev = previousServices.find(
            (item): boolean => item.location.id === service.location.id
          );
          return {
            ...rest,
            currentStats: stats,
            previousStats: prev?.stats ?? null,
          };
        }
      ),
    };
  },
});

const backendMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/metadata',
  params: t.type({
    query: t.intersection([t.type({ backendName: t.string }), rangeRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    metadata: { spanType: string | undefined; spanSubtype: string | undefined };
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const { backendName, start, end } = params.query;

    const metadata = await getMetadataForBackend({
      backendName,
      setup,
      start,
      end,
    });

    return { metadata };
  },
});

const backendLatencyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/charts/latency',
  params: t.type({
    query: t.intersection([
      t.type({ backendName: t.string }),
      rangeRt,
      kueryRt,
      environmentRt,
      offsetRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    currentTimeseries: Array<{ x: number; y: number }>;
    comparisonTimeseries: Array<{ x: number; y: number }> | null;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { backendName, kuery, environment, offset, start, end } =
      params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getLatencyChartsForBackend({
        backendName,
        setup,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getLatencyChartsForBackend({
            backendName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

const backendThroughputChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/charts/throughput',
  params: t.type({
    query: t.intersection([
      t.type({ backendName: t.string }),
      rangeRt,
      kueryRt,
      environmentRt,
      offsetRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    currentTimeseries: Array<{ x: number; y: number | null }>;
    comparisonTimeseries: Array<{ x: number; y: number | null }> | null;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { backendName, kuery, environment, offset, start, end } =
      params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getThroughputChartsForBackend({
        backendName,
        setup,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getThroughputChartsForBackend({
            backendName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

const backendFailedTransactionRateChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/backends/charts/error_rate',
  params: t.type({
    query: t.intersection([
      t.type({ backendName: t.string }),
      rangeRt,
      kueryRt,
      environmentRt,
      offsetRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    currentTimeseries: Array<{ x: number; y: number }>;
    comparisonTimeseries: Array<{ x: number; y: number }> | null;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { backendName, kuery, environment, offset, start, end } =
      params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getErrorRateChartsForBackend({
        backendName,
        setup,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getErrorRateChartsForBackend({
            backendName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

export const backendsRouteRepository = {
  ...topBackendsRoute,
  ...upstreamServicesForBackendRoute,
  ...backendMetadataRoute,
  ...backendLatencyChartsRoute,
  ...backendThroughputChartsRoute,
  ...backendFailedTransactionRateChartsRoute,
};
