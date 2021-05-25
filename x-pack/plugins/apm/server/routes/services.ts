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
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAnnotations } from '../lib/services/annotations';
import { getServices } from '../lib/services/get_services';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
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
import { withApmSpan } from '../utils/with_apm_span';
import { createApmServerRoute } from './create_apm_server_route';
import { createApmServerRouteRepository } from './create_apm_server_route_repository';
import {
  comparisonRangeRt,
  environmentRt,
  kueryRt,
  rangeRt,
} from './default_api_types';
import { offsetPreviousPeriodCoordinates } from '../../common/utils/offset_previous_period_coordinate';

const servicesRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params, logger } = resources;
    const { environment, kuery } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServices({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      logger,
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

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMetadataDetails({
      serviceName,
      setup,
      searchAggregatedTransactions,
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

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceMetadataIcons({
      serviceName,
      setup,
      searchAggregatedTransactions,
    });
  },
});

const serviceAgentNameRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/agent_name',
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
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceAgentName({
      serviceName,
      setup,
      searchAggregatedTransactions,
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

    return getServiceTransactionTypes({
      serviceName,
      setup,
      searchAggregatedTransactions: await getSearchAggregatedTransactions(
        setup
      ),
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
    const { kuery } = params.query;

    return getServiceNodeMetadata({
      kuery,
      setup,
      serviceName,
      serviceNodeName,
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
    const { environment } = params.query;

    const { observability } = plugins;

    const [
      annotationsClient,
      searchAggregatedTransactions,
    ] = await Promise.all([
      observability
        ? withApmSpan('get_scoped_annotations_client', () =>
            observability.setup.getScopedAnnotationsClient(context, request)
          )
        : undefined,
      getSearchAggregatedTransactions(setup),
    ]);

    return getServiceAnnotations({
      environment,
      setup,
      searchAggregatedTransactions,
      serviceName,
      annotationsClient,
      client: context.core.elasticsearch.client.asCurrentUser,
      logger,
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
      query: { kuery, transactionType, environment },
    } = params;
    return getServiceErrorGroupMainStatistics({
      kuery,
      serviceName,
      setup,
      transactionType,
      environment,
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
    } = params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const { start, end } = setup;

    const commonProps = {
      environment,
      kuery,
      searchAggregatedTransactions,
      serviceName,
      setup,
      transactionType,
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
    } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const { start, end } = setup;

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
    } = params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

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
    query: t.intersection([
      t.type({ transactionType: t.string }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { serviceName, serviceNodeName } = resources.params.path;
    const { transactionType, environment, kuery } = resources.params.query;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return await getServiceInstanceMetadataDetails({
      searchAggregatedTransactions,
      setup,
      serviceName,
      serviceNodeName,
      transactionType,
      environment,
      kuery,
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
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (resources) => {
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, numBuckets } = params.query;

    const serviceDependencies = await getServiceDependencies({
      serviceName,
      environment,
      setup,
      numBuckets,
    });

    return { serviceDependencies };
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
      query: { environment, kuery },
    } = params;

    const profilingTimeline = await getServiceProfilingTimeline({
      kuery,
      setup,
      serviceName,
      environment,
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
      query: { environment, kuery, valueType },
    } = params;

    return getServiceProfilingStatistics({
      kuery,
      serviceName,
      environment,
      valueType,
      setup,
      logger,
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

export const serviceRouteRepository = createApmServerRouteRepository()
  .add(servicesRoute)
  .add(serviceMetadataDetailsRoute)
  .add(serviceMetadataIconsRoute)
  .add(serviceAgentNameRoute)
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
  .add(serviceProfilingTimelineRoute)
  .add(serviceProfilingStatisticsRoute)
  .add(serviceAlertsRoute);
