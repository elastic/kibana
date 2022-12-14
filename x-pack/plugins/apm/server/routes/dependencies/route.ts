/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getMetadataForDependency } from './get_metadata_for_dependency';
import { getLatencyChartsForDependency } from './get_latency_charts_for_dependency';
import { getTopDependencies } from './get_top_dependencies';
import { getUpstreamServicesForDependency } from './get_upstream_services_for_dependency';
import { getThroughputChartsForDependency } from './get_throughput_charts_for_dependency';
import { getErrorRateChartsForDependency } from './get_error_rate_charts_for_dependency';
import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { offsetRt } from '../../../common/comparison_rt';
import {
  DependencyOperation,
  getTopDependencyOperations,
} from './get_top_dependency_operations';
import { getDependencyLatencyDistribution } from './get_dependency_latency_distribution';
import { OverallLatencyDistributionResponse } from '../latency_distribution/types';
import {
  DependencySpan,
  getTopDependencySpans,
} from './get_top_dependency_spans';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
    const apmEventClient = await getApmEventClient(resources);
    const { environment, offset, numBuckets, kuery, start, end } =
      resources.params.query;

    const opts = { apmEventClient, start, end, numBuckets, environment, kuery };

    const [currentDependencies, previousDependencies] = await Promise.all([
      getTopDependencies(opts),
      offset ? getTopDependencies({ ...opts, offset }) : Promise.resolve([]),
    ]);

    return {
      // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
      dependencies: currentDependencies.map((dependency) => {
        const { stats, ...rest } = dependency;
        const prev = previousDependencies.find(
          (item): boolean => item.location.id === dependency.location.id
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
    const apmEventClient = await getApmEventClient(resources);
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
      apmEventClient,
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
    query: t.intersection([t.type({ dependencyName: t.string }), rangeRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    metadata: { spanType: string | undefined; spanSubtype: string | undefined };
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;

    const { dependencyName, start, end } = params.query;

    const metadata = await getMetadataForDependency({
      dependencyName,
      apmEventClient,
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
        dependencyName: t.string,
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
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const {
      dependencyName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getLatencyChartsForDependency({
        dependencyName,
        spanName,
        searchServiceDestinationMetrics,
        apmEventClient,
        start,
        end,
        kuery,
        environment,
      }),
      offset
        ? getLatencyChartsForDependency({
            dependencyName,
            spanName,
            searchServiceDestinationMetrics,
            apmEventClient,
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
        dependencyName: t.string,
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
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const {
      dependencyName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getThroughputChartsForDependency({
        dependencyName,
        spanName,
        apmEventClient,
        start,
        end,
        kuery,
        environment,
        searchServiceDestinationMetrics,
      }),
      offset
        ? getThroughputChartsForDependency({
            dependencyName,
            spanName,
            apmEventClient,
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
        dependencyName: t.string,
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
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const {
      dependencyName,
      spanName,
      searchServiceDestinationMetrics,
      kuery,
      environment,
      offset,
      start,
      end,
    } = params.query;

    const [currentTimeseries, comparisonTimeseries] = await Promise.all([
      getErrorRateChartsForDependency({
        dependencyName,
        spanName,
        apmEventClient,
        start,
        end,
        kuery,
        environment,
        searchServiceDestinationMetrics,
      }),
      offset
        ? getErrorRateChartsForDependency({
            dependencyName,
            spanName,
            apmEventClient,
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
      t.type({
        dependencyName: t.string,
        searchServiceDestinationMetrics: toBooleanRt,
      }),
    ]),
  }),
  handler: async (
    resources
  ): Promise<{ operations: DependencyOperation[] }> => {
    const apmEventClient = await getApmEventClient(resources);

    const {
      query: {
        dependencyName,
        start,
        end,
        environment,
        kuery,
        offset,
        searchServiceDestinationMetrics,
      },
    } = resources.params;

    const operations = await getTopDependencyOperations({
      apmEventClient,
      dependencyName,
      start,
      end,
      offset,
      environment,
      kuery,
      searchServiceDestinationMetrics,
    });

    return { operations };
  },
});

const dependencyLatencyDistributionChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/charts/distribution',
  params: t.type({
    query: t.intersection([
      t.type({
        dependencyName: t.string,
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
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const {
      dependencyName,
      spanName,
      percentileThreshold,
      kuery,
      environment,
      start,
      end,
    } = params.query;

    return getDependencyLatencyDistribution({
      apmEventClient,
      dependencyName,
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
      t.type({ dependencyName: t.string, spanName: t.string }),
      t.partial({ sampleRangeFrom: toNumberRt, sampleRangeTo: toNumberRt }),
    ]),
  }),
  handler: async (resources): Promise<{ spans: DependencySpan[] }> => {
    const apmEventClient = await getApmEventClient(resources);

    const {
      query: {
        dependencyName,
        spanName,
        start,
        end,
        environment,
        kuery,
        sampleRangeFrom,
        sampleRangeTo,
      },
    } = resources.params;

    const spans = await getTopDependencySpans({
      apmEventClient,
      dependencyName,
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

export const dependencisRouteRepository = {
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
