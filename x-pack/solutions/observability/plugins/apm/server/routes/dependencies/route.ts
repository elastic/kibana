/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { jsonRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { offsetRt } from '../../../common/comparison_rt';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import type { DependenciesTimeseriesStatisticsResponse } from './get_dependencies_timeseries_statistics';
import { getDependenciesTimeseriesStatistics } from './get_dependencies_timeseries_statistics';
import type { DependencyLatencyDistributionResponse } from './get_dependency_latency_distribution';
import { getDependencyLatencyDistribution } from './get_dependency_latency_distribution';
import { getErrorRateChartsForDependency } from './get_error_rate_charts_for_dependency';
import type { LatencyChartsDependencyResponse } from './get_latency_charts_for_dependency';
import { getLatencyChartsForDependency } from './get_latency_charts_for_dependency';
import type { MetadataForDependencyResponse } from './get_metadata_for_dependency';
import { getMetadataForDependency } from './get_metadata_for_dependency';
import type { ThroughputChartsForDependencyResponse } from './get_throughput_charts_for_dependency';
import { getThroughputChartsForDependency } from './get_throughput_charts_for_dependency';
import type { TopDependenciesResponse } from './get_top_dependencies';
import { getTopDependencies } from './get_top_dependencies';
import type { DependencyOperation } from './get_top_dependency_operations';
import { getTopDependencyOperations } from './get_top_dependency_operations';
import type { DependencySpan } from './get_top_dependency_spans';
import { getTopDependencySpans } from './get_top_dependency_spans';
import type { UpstreamServicesForDependencyResponse } from './get_upstream_services_for_dependency';
import { getUpstreamServicesForDependency } from './get_upstream_services_for_dependency';

const topDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/top_dependencies',
  params: t.type({
    query: t.intersection([rangeRt, environmentRt, kueryRt, t.type({ numBuckets: toNumberRt })]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TopDependenciesResponse> => {
    const { request, core } = resources;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability: 1 }),
    ]);
    const { environment, numBuckets, kuery, start, end } = resources.params.query;

    return getTopDependencies({
      apmEventClient,
      start,
      end,
      numBuckets,
      environment,
      kuery,
      randomSampler,
      withTimeseries: false,
    });
  },
});

const topDependenciesStatisticsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/dependencies/top_dependencies/statistics',
  params: t.type({
    query: t.intersection([
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
      t.type({ numBuckets: toNumberRt }),
    ]),
    body: t.type({ dependencyNames: jsonRt.pipe(t.array(t.string)) }),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DependenciesTimeseriesStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { environment, offset, numBuckets, kuery, start, end } = resources.params.query;
    const { dependencyNames } = resources.params.body;

    return getDependenciesTimeseriesStatistics({
      apmEventClient,
      start,
      end,
      environment,
      kuery,
      offset,
      dependencyNames,
      searchServiceDestinationMetrics: true,
      numBuckets,
    });
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<UpstreamServicesForDependencyResponse> => {
    const { request, core } = resources;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability: 1 }),
    ]);

    const {
      query: { dependencyName, environment, offset, numBuckets, kuery, start, end },
    } = resources.params;

    return getUpstreamServicesForDependency({
      dependencyName,
      apmEventClient,
      start,
      end,
      numBuckets,
      environment,
      kuery,
      offset,
      randomSampler,
    });
  },
});

const dependencyMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/metadata',
  params: t.type({
    query: t.intersection([t.type({ dependencyName: t.string }), rangeRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    metadata: MetadataForDependencyResponse;
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<LatencyChartsDependencyResponse> => {
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

    return getLatencyChartsForDependency({
      apmEventClient,
      dependencyName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    });
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ThroughputChartsForDependencyResponse> => {
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

    return getThroughputChartsForDependency({
      apmEventClient,
      dependencyName,
      searchServiceDestinationMetrics,
      spanName,
      kuery,
      environment,
      offset,
      start,
      end,
    });
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
  security: { authz: { requiredPrivileges: ['apm'] } },
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

    return getErrorRateChartsForDependency({
      apmEventClient,
      dependencyName,
      start,
      end,
      environment,
      kuery,
      searchServiceDestinationMetrics,
      spanName,
      offset,
    });
  },
});

const dependencyOperationsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/dependencies/operations',
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  handler: async (resources): Promise<{ operations: DependencyOperation[] }> => {
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
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DependencyLatencyDistributionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { dependencyName, spanName, percentileThreshold, kuery, environment, start, end } =
      params.query;

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
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  ...topDependenciesStatisticsRoute,
};
