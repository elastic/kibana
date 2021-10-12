/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { jsonRt, isoToEpochRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { uniq } from 'lodash';
import { latencyAggregationTypeRt } from '../../common/latency_aggregation_types';
import { ProfilingValueType } from '../../common/profiling';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { getThroughputUnit } from '../lib/helpers/calculate_throughput';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAnnotations } from '../lib/services/annotations';
import { getServices } from '../lib/services/get_services';
import { getServiceAgent } from '../lib/services/get_service_agent';
import { getServiceAlerts } from '../lib/services/get_service_alerts';
import { getServiceDependencies } from '../lib/services/get_service_dependencies';
import { getServiceInstanceMetadataDetails } from '../lib/services/get_service_instance_metadata_details';
import { getServiceErrorGroupPeriods } from '../lib/services/get_service_error_groups/get_service_error_group_detailed_statistics';
import { getServiceErrorGroupMainStatistics } from '../lib/services/get_service_error_groups/get_service_error_group_main_statistics';
import { getServiceInstancesDetailedStatisticsPeriods } from '../lib/services/get_service_instances/detailed_statistics';
import { getServiceInstancesMainStatistics } from '../lib/services/get_service_instances/main_statistics';
import { getServiceMetadataDetails } from '../lib/services/get_service_metadata_details';
import { getServiceMetadataIcons } from '../lib/services/get_service_metadata_icons';
import { getServiceNodeMetadata } from '../lib/services/get_service_node_metadata';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { getThroughput } from '../lib/services/get_throughput';
import { getServiceProfilingStatistics } from '../lib/services/profiling/get_service_profiling_statistics';
import { getServiceProfilingTimeline } from '../lib/services/profiling/get_service_profiling_timeline';
import { getServiceInfrastructure } from '../lib/services/get_service_infrastructure';
import { withApmSpan } from '../utils/with_apm_span';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import {
  comparisonRangeRt,
  environmentRt,
  kueryRt,
  offsetRt,
  rangeRt,
} from './default_api_types';
import { offsetPreviousPeriodCoordinates } from '../../common/utils/offset_previous_period_coordinate';
import { getServicesDetailedStatistics } from '../lib/services/get_services_detailed_statistics';
import { getServiceDependenciesBreakdown } from '../lib/services/get_service_dependencies_breakdown';
import { getBucketSizeForAggregatedTransactions } from '../lib/helpers/get_bucket_size_for_aggregated_transactions';

const servicesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params, logger } = resources;
    const { environment, kuery, start, end } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
    });

    return getServices({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      logger,
      start,
      end,
    });
  },
});

const servicesDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/detailed_statistics',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      offsetRt,
      t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { environment, kuery, offset, serviceNames, start, end } =
      params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      start,
      end,
      kuery,
    });

    if (!serviceNames.length) {
      throw Boom.badRequest(`serviceNames cannot be empty`);
    }

    return getServicesDetailedStatistics({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      offset,
      serviceNames,
      start,
      end,
    });
  },
});

const serviceMetadataDetailsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/details',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });

    return getServiceMetadataDetails({
      serviceName,
      setup,
      searchAggregatedTransactions,
      start,
      end,
    });
  },
});

const serviceMetadataIconsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/icons',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });

    return getServiceMetadataIcons({
      serviceName,
      setup,
      searchAggregatedTransactions,
      start,
      end,
    });
  },
});

const serviceAgentRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/agent',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      apmEventClient: setup.apmEventClient,
      config: setup.config,
      start,
      end,
      kuery: '',
    });

    return getServiceAgent({
      serviceName,
      setup,
      searchAggregatedTransactions,
      start,
      end,
    });
  },
});

const serviceTransactionTypesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_types',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    return getServiceTransactionTypes({
      serviceName,
      setup,
      searchAggregatedTransactions: await getSearchAggregatedTransactions({
        apmEventClient: setup.apmEventClient,
        config: setup.config,
        start,
        end,
        kuery: '',
      }),
      start,
      end,
    });
  },
});

const serviceNodeMetadataRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName, serviceNodeName } = params.path;
    const { kuery, start, end } = params.query;

    return getServiceNodeMetadata({
      kuery,
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
    });
  },
});

const serviceAnnotationsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params, plugins, context, request, logger } = resources;
    const { serviceName } = params.path;
    const { environment, start, end } = params.query;

    const { observability } = plugins;

    const [annotationsClient, searchAggregatedTransactions] = await Promise.all(
      [
        observability
          ? withApmSpan('get_scoped_annotations_client', () =>
              observability.setup.getScopedAnnotationsClient(context, request)
            )
          : undefined,
        getSearchAggregatedTransactions({
          apmEventClient: setup.apmEventClient,
          config: setup.config,
          start,
          end,
          kuery: '',
        }),
      ]
    );

    return getServiceAnnotations({
      environment,
      setup,
      searchAggregatedTransactions,
      serviceName,
      annotationsClient,
      client: context.core.elasticsearch.client.asCurrentUser,
      logger,
      start,
      end,
    });
  },
});

const serviceAnnotationsCreateRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/services/{serviceName}/annotation',
  options: {
    tags: ['access:apm', 'access:apm_write'],
  },
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    body: t.intersection([
      t.type({
        '@timestamp': isoToEpochRt,
        service: t.intersection([
          t.type({
            version: t.string,
          }),
          t.partial({
            environment: t.string,
          }),
        ]),
      }),
      t.partial({
        message: t.string,
        tags: t.array(t.string),
      }),
    ]),
  }),
  handler: async (resources) => {
    const {
      request,
      context,
      plugins: { observability },
      params,
    } = resources;

    const annotationsClient = observability
      ? await withApmSpan('get_scoped_annotations_client', () =>
          observability.setup.getScopedAnnotationsClient(context, request)
        )
      : undefined;

    if (!annotationsClient) {
      throw Boom.notFound();
    }

    const { body, path } = params;

    return withApmSpan('create_annotation', () =>
      annotationsClient.create({
        message: body.service.version,
        ...body,
        '@timestamp': new Date(body['@timestamp']).toISOString(),
        annotation: {
          type: 'deployment',
        },
        service: {
          ...body.service,
          name: path.serviceName,
        },
        tags: uniq(['apm'].concat(body.tags ?? [])),
      })
    );
  },
});

const serviceErrorGroupsMainStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/error_groups/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        transactionType: t.string,
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const {
      path: { serviceName },
      query: { kuery, transactionType, environment, start, end },
    } = params;

    return getServiceErrorGroupMainStatistics({
      kuery,
      serviceName,
      setup,
      transactionType,
      environment,
      start,
      end,
    });
  },
});

const serviceErrorGroupsDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/error_groups/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      comparisonRangeRt,
      t.type({
        numBuckets: toNumberRt,
        transactionType: t.string,
        groupIds: jsonRt.pipe(t.array(t.string)),
      }),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;

    const {
      path: { serviceName },
      query: {
        environment,
        kuery,
        numBuckets,
        transactionType,
        groupIds,
        comparisonStart,
        comparisonEnd,
        start,
        end,
      },
    } = params;

    return getServiceErrorGroupPeriods({
      environment,
      kuery,
      serviceName,
      setup,
      numBuckets,
      transactionType,
      groupIds,
      comparisonStart,
      comparisonEnd,
      start,
      end,
    });
  },
});

const serviceThroughputRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/throughput',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, comparisonRangeRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      comparisonStart,
      comparisonEnd,
      start,
      end,
    } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    const { bucketSize, intervalString } =
      getBucketSizeForAggregatedTransactions({
        start,
        end,
        searchAggregatedTransactions,
      });

    const throughputUnit = getThroughputUnit(bucketSize);

    const commonProps = {
      environment,
      kuery,
      searchAggregatedTransactions,
      serviceName,
      setup,
      transactionType,
      transactionName,
      throughputUnit,
      intervalString,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getThroughput({
        ...commonProps,
        start,
        end,
      }),
      comparisonStart && comparisonEnd
        ? getThroughput({
            ...commonProps,
            start: comparisonStart,
            end: comparisonEnd,
          })
        : [],
    ]);

    return {
      currentPeriod,
      previousPeriod: offsetPreviousPeriodCoordinates({
        currentPeriodTimeseries: currentPeriod,
        previousPeriodTimeseries: previousPeriod,
      }),
      throughputUnit,
    };
  },
});

const serviceInstancesMainStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/service_overview_instances/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        transactionType: t.string,
      }),
      comparisonRangeRt,
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      latencyAggregationType,
      comparisonStart,
      comparisonEnd,
      start,
      end,
    } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceInstancesMainStatistics({
        environment,
        kuery,
        latencyAggregationType,
        serviceName,
        setup,
        transactionType,
        searchAggregatedTransactions,
        start,
        end,
      }),
      ...(comparisonStart && comparisonEnd
        ? [
            getServiceInstancesMainStatistics({
              environment,
              kuery,
              latencyAggregationType,
              serviceName,
              setup,
              transactionType,
              searchAggregatedTransactions,
              start: comparisonStart,
              end: comparisonEnd,
            }),
          ]
        : []),
    ]);

    return { currentPeriod, previousPeriod };
  },
});

const serviceInstancesDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        transactionType: t.string,
        serviceNodeIds: jsonRt.pipe(t.array(t.string)),
        numBuckets: toNumberRt,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
      comparisonRangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      comparisonStart,
      comparisonEnd,
      serviceNodeIds,
      numBuckets,
      latencyAggregationType,
      start,
      end,
    } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    return getServiceInstancesDetailedStatisticsPeriods({
      environment,
      kuery,
      latencyAggregationType,
      serviceName,
      setup,
      transactionType,
      searchAggregatedTransactions,
      numBuckets,
      serviceNodeIds,
      comparisonStart,
      comparisonEnd,
      start,
      end,
    });
  },
});

export const serviceInstancesMetadataDetails = createApmServerRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { serviceName, serviceNodeName } = resources.params.path;
    const { start, end } = resources.params.query;

    return await getServiceInstanceMetadataDetails({
      setup,
      serviceName,
      serviceNodeName,
      start,
      end,
    });
  },
});

export const serviceDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/dependencies',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        numBuckets: toNumberRt,
      }),
      environmentRt,
      rangeRt,
      offsetRt,
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, numBuckets, start, end, offset } = params.query;

    const opts = {
      setup,
      start,
      end,
      serviceName,
      environment,
      numBuckets,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceDependencies(opts),
      ...(offset ? [getServiceDependencies({ ...opts, offset })] : [[]]),
    ]);

    return {
      serviceDependencies: currentPeriod.map((item) => {
        const { stats, ...rest } = item;
        const previousPeriodItem = previousPeriod.find(
          (prevItem) => item.location.id === prevItem.location.id
        );

        return {
          ...rest,
          currentStats: stats,
          previousStats: previousPeriodItem?.stats || null,
        };
      }),
    };
  },
});

export const serviceDependenciesBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/dependencies/breakdown',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt, kueryRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, start, end, kuery } = params.query;

    const breakdown = await getServiceDependenciesBreakdown({
      setup,
      start,
      end,
      serviceName,
      environment,
      kuery,
    });

    return {
      breakdown,
    };
  },
});

const serviceProfilingTimelineRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/profiling/timeline',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const {
      path: { serviceName },
      query: { environment, kuery, start, end },
    } = params;

    const profilingTimeline = await getServiceProfilingTimeline({
      kuery,
      setup,
      serviceName,
      environment,
      start,
      end,
    });

    return { profilingTimeline };
  },
});

const serviceProfilingStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/profiling/statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.type({
        valueType: t.union([
          t.literal(ProfilingValueType.wallTime),
          t.literal(ProfilingValueType.cpuTime),
          t.literal(ProfilingValueType.samples),
          t.literal(ProfilingValueType.allocObjects),
          t.literal(ProfilingValueType.allocSpace),
          t.literal(ProfilingValueType.inuseObjects),
          t.literal(ProfilingValueType.inuseSpace),
        ]),
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const { params, logger } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, valueType, start, end },
    } = params;

    return getServiceProfilingStatistics({
      kuery,
      serviceName,
      environment,
      valueType,
      setup,
      logger,
      start,
      end,
    });
  },
});

const serviceAlertsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/alerts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      t.type({
        transactionType: t.string,
      }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async ({ context, params, ruleDataClient }) => {
    const {
      query: { start, end, environment, transactionType },
      path: { serviceName },
    } = params;

    return {
      alerts: await getServiceAlerts({
        ruleDataClient,
        start,
        end,
        serviceName,
        environment,
        transactionType,
      }),
    };
  },
});

const serviceInfrastructureRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/infrastructure',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);

    const { params } = resources;

    const {
      path: { serviceName },
      query: { environment, kuery, start, end },
    } = params;

    const serviceInfrastructure = await getServiceInfrastructure({
      setup,
      serviceName,
      environment,
      kuery,
      start,
      end,
    });
    return { serviceInfrastructure };
  },
});

export const serviceRouteRepository = createApmServerRouteRepository()
  .add(servicesRoute)
  .add(servicesDetailedStatisticsRoute)
  .add(serviceMetadataDetailsRoute)
  .add(serviceMetadataIconsRoute)
  .add(serviceAgentRoute)
  .add(serviceTransactionTypesRoute)
  .add(serviceNodeMetadataRoute)
  .add(serviceAnnotationsRoute)
  .add(serviceAnnotationsCreateRoute)
  .add(serviceErrorGroupsMainStatisticsRoute)
  .add(serviceErrorGroupsDetailedStatisticsRoute)
  .add(serviceInstancesMetadataDetails)
  .add(serviceThroughputRoute)
  .add(serviceInstancesMainStatisticsRoute)
  .add(serviceInstancesDetailedStatisticsRoute)
  .add(serviceDependenciesRoute)
  .add(serviceDependenciesBreakdownRoute)
  .add(serviceProfilingTimelineRoute)
  .add(serviceProfilingStatisticsRoute)
  .add(serviceAlertsRoute)
  .add(serviceInfrastructureRoute);
