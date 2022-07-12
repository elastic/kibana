/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { setupRequest } from '../../lib/helpers/setup_request';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getMetadataForBackend } from './get_metadata_for_backend';
import { getLatencyChartsForBackend } from './get_latency_charts_for_backend';
import { getTopDependencies } from './get_top_dependencies';
import { getUpstreamServicesForDependency } from './get_upstream_services_for_dependency';
import { getThroughputChartsForBackend } from './get_throughput_charts_for_backend';
import { getErrorRateChartsForBackend } from './get_error_rate_charts_for_backend';
import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { offsetRt } from '../../../common/comparison_rt';
import {
  BackendOperation,
  getTopBackendOperations,
} from './get_top_backend_operations';
import { getBackendLatencyDistribution } from './get_backend_latency_distribution';
import { OverallLatencyDistributionResponse } from '../latency_distribution/types';
import { BackendSpan, getTopBackendSpans } from './get_top_backend_spans';

const topDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/top_dependencies',
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
    dependencies: Array<{
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

    const [currentDependencies, previousDependencies] = await Promise.all([
      getTopDependencies(opts),
      offset ? getTopDependencies({ ...opts, offset }) : Promise.resolve([]),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      dependencies: currentDependencies.map((backend) => {
        const { stats, ...rest } = backend;
        const prev = previousDependencies.find(
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

const upstreamServicesForDependencyRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/upstream_services',
  params: t.intersection([
    t.type({
      query: t.intersection([
        t.type({ dependencyName: t.string }),
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
        dependencyName,
        environment,
        offset,
        numBuckets,
        kuery,
        start,
        end,
      },
    } = resources.params;

    const opts = {
      dependencyName,
      setup,
      start,
      end,
      numBuckets,
      environment,
      kuery,
    };

    const [currentServices, previousServices] = await Promise.all([
      getUpstreamServicesForDependency(opts),
      offset
        ? getUpstreamServicesForDependency({ ...opts, offset })
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

const dependencyMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/metadata',
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

const dependencyLatencyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/charts/latency',
  params: t.type({
    query: t.intersection([
      t.type({
        backendName: t.string,
        spanName: t.string,
        searchServiceDestinationMetrics: toBooleanRt,
      }),
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
    const {
      backendName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getLatencyChartsForBackend({
        backendName,
        spanName,
        searchServiceDestinationMetrics,
        setup,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getLatencyChartsForBackend({
            backendName,
            spanName,
            searchServiceDestinationMetrics,
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

const dependencyThroughputChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/charts/throughput',
  params: t.type({
    query: t.intersection([
      t.type({
        backendName: t.string,
        spanName: t.string,
        searchServiceDestinationMetrics: toBooleanRt,
      }),
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
    const {
      backendName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getThroughputChartsForBackend({
        backendName,
        spanName,
        setup,
        start,
        end,
        kuery,
        environment,
        searchServiceDestinationMetrics,
      }),
      offset
        ? getThroughputChartsForBackend({
            backendName,
            spanName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
            searchServiceDestinationMetrics,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

const dependencyFailedTransactionRateChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/charts/error_rate',
  params: t.type({
    query: t.intersection([
      t.type({
        backendName: t.string,
        spanName: t.string,
        searchServiceDestinationMetrics: toBooleanRt,
      }),
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
    const {
      backendName,
      spanName,
      searchServiceDestinationMetrics,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getErrorRateChartsForBackend({
        backendName,
        spanName,
        setup,
        start,
        end,
        kuery,
        environment,
        searchServiceDestinationMetrics,
      }),
      offset
        ? getErrorRateChartsForBackend({
            backendName,
            spanName,
            setup,
            start,
            end,
            kuery,
            environment,
            offset,
            searchServiceDestinationMetrics,
          })
        : null,
    ]);

    return { currentTimeseries, comparisonTimeseries };
  },
});

const dependencyOperationsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/operations',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      offsetRt,
      t.type({ backendName: t.string }),
    ]),
  }),
  handler: async (resources): Promise<{ operations: BackendOperation[] }> => {
    const setup = await setupRequest(resources);

    const {
      query: { backendName, start, end, environment, kuery, offset },
    } = resources.params;

    const operations = await getTopBackendOperations({
      setup,
      backendName,
      start,
      end,
      offset,
      environment,
      kuery,
    });

    return { operations };
  },
});

const dependencyLatencyDistributionChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/charts/distribution',
  params: t.type({
    query: t.intersection([
      t.type({
        backendName: t.string,
        spanName: t.string,
        percentileThreshold: toNumberRt,
      }),
      rangeRt,
      kueryRt,
      environmentRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    allSpansDistribution: OverallLatencyDistributionResponse;
    failedSpansDistribution: OverallLatencyDistributionResponse;
  }> => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const {
      backendName,
      spanName,
      percentileThreshold,
      kuery,
      environment,
      start,
      end,
    } = params.query;

    return getBackendLatencyDistribution({
      setup,
      backendName,
      spanName,
      percentileThreshold,
      kuery,
      environment,
      start,
      end,
    });
  },
});

const topDependencySpansRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/operations/spans',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      t.type({ backendName: t.string, spanName: t.string }),
      t.partial({ sampleRangeFrom: toNumberRt, sampleRangeTo: toNumberRt }),
    ]),
  }),
  handler: async (resources): Promise<{ spans: BackendSpan[] }> => {
    const setup = await setupRequest(resources);

    const {
      query: {
        backendName,
        spanName,
        start,
        end,
        environment,
        kuery,
        sampleRangeFrom,
        sampleRangeTo,
      },
    } = resources.params;

    const spans = await getTopBackendSpans({
      setup,
      backendName,
      spanName,
      start,
      end,
      environment,
      kuery,
      sampleRangeFrom,
      sampleRangeTo,
    });

    return { spans };
  },
});

export const backendsRouteRepository = {
  ...topDependenciesRoute,
  ...upstreamServicesForDependencyRoute,
  ...dependencyMetadataRoute,
  ...dependencyLatencyChartsRoute,
  ...dependencyThroughputChartsRoute,
  ...dependencyFailedTransactionRateChartsRoute,
  ...dependencyOperationsRoute,
  ...dependencyLatencyDistributionChartsRoute,
  ...topDependencySpansRoute,
};
