/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  routeDefinitions,
  type TopDependenciesResponse,
  type DependenciesTimeseriesStatisticsResponse,
  type UpstreamServicesForDependencyResponse,
  type DependencyMetadataRouteResponse,
  type LatencyChartsDependencyResponse,
  type ThroughputChartsForDependencyResponse,
  type DependencyErrorRateChartsResponse,
  type DependencyOperationsResponse,
  type DependencyLatencyDistributionResponse,
  type TopDependencySpansResponse,
} from '@kbn/apm-api-shared';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getDependenciesTimeseriesStatistics } from './get_dependencies_timeseries_statistics';
import { getDependencyLatencyDistribution } from './get_dependency_latency_distribution';
import { getErrorRateChartsForDependency } from './get_error_rate_charts_for_dependency';
import { getLatencyChartsForDependency } from './get_latency_charts_for_dependency';
import { getMetadataForDependency } from './get_metadata_for_dependency';
import { getThroughputChartsForDependency } from './get_throughput_charts_for_dependency';
import { getTopDependencies } from './get_top_dependencies';
import { getTopDependencyOperations } from './get_top_dependency_operations';
import { getTopDependencySpans } from './get_top_dependency_spans';
import { getUpstreamServicesForDependency } from './get_upstream_services_for_dependency';

const topDependenciesRoute = createApmServerRoute({
  endpoint: routeDefinitions.dependencies.topDependencies.endpoint,
  params: routeDefinitions.dependencies.topDependencies.params,
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
  endpoint: routeDefinitions.dependencies.topDependenciesStatistics.endpoint,
  params: routeDefinitions.dependencies.topDependenciesStatistics.params,
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
  endpoint: routeDefinitions.dependencies.upstreamServices.endpoint,
  params: routeDefinitions.dependencies.upstreamServices.params,
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
  endpoint: routeDefinitions.dependencies.metadata.endpoint,
  params: routeDefinitions.dependencies.metadata.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DependencyMetadataRouteResponse> => {
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
  endpoint: routeDefinitions.dependencies.latencyCharts.endpoint,
  params: routeDefinitions.dependencies.latencyCharts.params,
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
  endpoint: routeDefinitions.dependencies.throughputCharts.endpoint,
  params: routeDefinitions.dependencies.throughputCharts.params,
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
  endpoint: routeDefinitions.dependencies.errorRateCharts.endpoint,
  params: routeDefinitions.dependencies.errorRateCharts.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DependencyErrorRateChartsResponse> => {
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
  endpoint: routeDefinitions.dependencies.operations.endpoint,
  params: routeDefinitions.dependencies.operations.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DependencyOperationsResponse> => {
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
  endpoint: routeDefinitions.dependencies.latencyDistribution.endpoint,
  params: routeDefinitions.dependencies.latencyDistribution.params,
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
  endpoint: routeDefinitions.dependencies.topDependencySpans.endpoint,
  params: routeDefinitions.dependencies.topDependencySpans.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<TopDependencySpansResponse> => {
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
