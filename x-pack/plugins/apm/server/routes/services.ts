/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { uniq } from 'lodash';
import {
  LatencyAggregationType,
  latencyAggregationTypeRt,
} from '../../common/latency_aggregation_types';
import { ProfilingValueType } from '../../common/profiling';
import { isoToEpochRt } from '../../common/runtime_types/iso_to_epoch_rt';
import { jsonRt } from '../../common/runtime_types/json_rt';
import { toNumberRt } from '../../common/runtime_types/to_number_rt';
import { getSearchAggregatedTransactions } from '../lib/helpers/aggregated_transactions';
import { setupRequest } from '../lib/helpers/setup_request';
import { getServiceAnnotations } from '../lib/services/annotations';
import { getServices } from '../lib/services/get_services';
import { getServiceAgentName } from '../lib/services/get_service_agent_name';
import { getServiceDependencies } from '../lib/services/get_service_dependencies';
import { getServiceErrorGroupPeriods } from '../lib/services/get_service_error_groups/get_service_error_group_comparison_statistics';
import { getServiceErrorGroupPrimaryStatistics } from '../lib/services/get_service_error_groups/get_service_error_group_primary_statistics';
import { getServiceInstancesComparisonStatisticsPeriods } from '../lib/services/get_service_instances/comparison_statistics';
import { getServiceInstancesPrimaryStatistics } from '../lib/services/get_service_instances/primary_statistics';
import { getServiceMetadataDetails } from '../lib/services/get_service_metadata_details';
import { getServiceMetadataIcons } from '../lib/services/get_service_metadata_icons';
import { getServiceNodeMetadata } from '../lib/services/get_service_node_metadata';
import { getServiceTransactionTypes } from '../lib/services/get_service_transaction_types';
import { getThroughput } from '../lib/services/get_throughput';
import { getServiceProfilingStatistics } from '../lib/services/profiling/get_service_profiling_statistics';
import { getServiceProfilingTimeline } from '../lib/services/profiling/get_service_profiling_timeline';
import { offsetPreviousPeriodCoordinates } from '../utils/offset_previous_period_coordinate';
import { withApmSpan } from '../utils/with_apm_span';
import { createRoute } from './create_route';
import {
  comparisonRangeRt,
  environmentRt,
  kueryRt,
  rangeRt,
} from './default_api_types';

export const servicesRoute = createRoute({
  endpoint: 'GET /api/apm/services',
  params: t.type({
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { environment, kuery } = context.params.query;
    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServices({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      logger: context.logger,
    });
  },
});

export const serviceMetadataDetailsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/details',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;

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

export const serviceMetadataIconsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/metadata/icons',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;

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

export const serviceAgentNameRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/agent_name',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
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

export const serviceTransactionTypesRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/transaction_types',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    return getServiceTransactionTypes({
      serviceName,
      setup,
      searchAggregatedTransactions: await getSearchAggregatedTransactions(
        setup
      ),
    });
  },
});

export const serviceNodeMetadataRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName, serviceNodeName } = context.params.path;
    const { kuery } = context.params.query;

    return getServiceNodeMetadata({
      kuery,
      setup,
      serviceName,
      serviceNodeName,
    });
  },
});

export const serviceAnnotationsRoute = createRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/annotation/search',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment } = context.params.query;

    const { observability } = context.plugins;

    const [
      annotationsClient,
      searchAggregatedTransactions,
    ] = await Promise.all([
      observability
        ? withApmSpan('get_scoped_annotations_client', () =>
            observability.getScopedAnnotationsClient(context, request)
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
      logger: context.logger,
    });
  },
});

export const serviceAnnotationsCreateRoute = createRoute({
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
  handler: async ({ request, context }) => {
    const { observability } = context.plugins;

    const annotationsClient = observability
      ? await withApmSpan('get_scoped_annotations_client', () =>
          observability.getScopedAnnotationsClient(context, request)
        )
      : undefined;

    if (!annotationsClient) {
      throw Boom.notFound();
    }

    const { body, path } = context.params;

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

export const serviceErrorGroupsPrimaryStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/error_groups/primary_statistics',
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
      query: { kuery, transactionType, environment },
    } = context.params;
    return getServiceErrorGroupPrimaryStatistics({
      kuery,
      serviceName,
      setup,
      transactionType,
      environment,
    });
  },
});

export const serviceErrorGroupsComparisonStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/error_groups/comparison_statistics',
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

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
    } = context.params;

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

export const serviceThroughputRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
      transactionType,
      comparisonStart,
      comparisonEnd,
    } = context.params.query;
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

export const serviceInstancesPrimaryStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/service_overview_instances/primary_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        transactionType: t.string,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const { environment, kuery, transactionType } = context.params.query;
    const latencyAggregationType = (context.params.query
      .latencyAggregationType as unknown) as LatencyAggregationType;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    const { start, end } = setup;

    const serviceInstances = await getServiceInstancesPrimaryStatistics({
      environment,
      kuery,
      latencyAggregationType,
      serviceName,
      setup,
      transactionType,
      searchAggregatedTransactions,
      start,
      end,
    });

    return { serviceInstances };
  },
});

export const serviceInstancesComparisonStatisticsRoute = createRoute({
  endpoint:
    'GET /api/apm/services/{serviceName}/service_overview_instances/comparison_statistics',
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);
    const { serviceName } = context.params.path;
    const {
      environment,
      kuery,
      transactionType,
      comparisonStart,
      comparisonEnd,
      serviceNodeIds,
      numBuckets,
    } = context.params.query;
    const latencyAggregationType = (context.params.query
      .latencyAggregationType as unknown) as LatencyAggregationType;

    const searchAggregatedTransactions = await getSearchAggregatedTransactions(
      setup
    );

    return getServiceInstancesComparisonStatisticsPeriods({
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

export const serviceDependenciesRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const { serviceName } = context.params.path;
    const { environment, numBuckets } = context.params.query;

    const serviceDependencies = await getServiceDependencies({
      serviceName,
      environment,
      setup,
      numBuckets,
    });

    return { serviceDependencies };
  },
});

export const serviceProfilingTimelineRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
      query: { environment, kuery },
    } = context.params;

    const profilingTimeline = await getServiceProfilingTimeline({
      kuery,
      setup,
      serviceName,
      environment,
    });

    return { profilingTimeline };
  },
});

export const serviceProfilingStatisticsRoute = createRoute({
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
  handler: async ({ context, request }) => {
    const setup = await setupRequest(context, request);

    const {
      path: { serviceName },
      query: { environment, kuery, valueType },
    } = context.params;

    return getServiceProfilingStatistics({
      kuery,
      serviceName,
      environment,
      valueType,
      setup,
      logger: context.logger,
    });
  },
});
