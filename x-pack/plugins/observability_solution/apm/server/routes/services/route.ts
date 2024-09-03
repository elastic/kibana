/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isoToEpochRt, jsonRt, toBooleanRt, toNumberRt } from '@kbn/io-ts-utils';
import {
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
  UnknownMLCapabilitiesError,
} from '@kbn/ml-plugin/server';
import { Annotation } from '@kbn/observability-plugin/common/annotations';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import * as t from 'io-ts';
import { isEmpty, mergeWith, uniq } from 'lodash';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { ServiceAnomalyTimeseries } from '../../../common/anomaly_detection/service_anomaly_timeseries';
import { offsetRt } from '../../../common/comparison_rt';
import { instancesSortFieldRt } from '../../../common/instances';
import { latencyAggregationTypeRt } from '../../../common/latency_aggregation_types';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { getAnomalyTimeseries } from '../../lib/anomaly_detection/get_anomaly_timeseries';
import { createInfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  filtersRt,
  kueryRt,
  probabilityRt,
  rangeRt,
  serviceTransactionDataSourceRt,
} from '../default_api_types';
import { getServiceGroup } from '../service_groups/get_service_group';
import { getServiceAnnotations, ServiceAnnotationResponse } from './annotations';
import { getServicesItems, ServicesItemsResponse } from './get_services/get_services_items';
import { getServicesAlerts, ServiceAlertsResponse } from './get_services/get_service_alerts';
import {
  getServiceTransactionDetailedStatsPeriods,
  ServiceTransactionDetailedStatPeriodsResponse,
} from './get_services_detailed_statistics/get_service_transaction_detailed_statistics';
import { getServiceAgent, ServiceAgentResponse } from './get_service_agent';
import { getServiceDependencies, ServiceDependenciesResponse } from './get_service_dependencies';
import {
  getServiceDependenciesBreakdown,
  ServiceDependenciesBreakdownResponse,
} from './get_service_dependencies_breakdown';
import {
  getServiceInstancesDetailedStatisticsPeriods,
  ServiceInstancesDetailedStatisticsResponse,
} from './get_service_instances/detailed_statistics';
import {
  getServiceInstancesMainStatistics,
  ServiceInstanceMainStatisticsResponse,
} from './get_service_instances/main_statistics';
import {
  getServiceInstanceContainerMetadata,
  ServiceInstanceContainerMetadataDetails,
} from './get_service_instance_container_metadata';
import {
  getServiceInstanceMetadataDetails,
  ServiceInstanceMetadataDetailsResponse,
} from './get_service_instance_metadata_details';
import { getServiceMetadataDetails, ServiceMetadataDetails } from './get_service_metadata_details';
import { getServiceMetadataIcons, ServiceMetadataIcons } from './get_service_metadata_icons';
import { getServiceNodeMetadata, ServiceNodeMetadataResponse } from './get_service_node_metadata';
import { getServiceOverviewContainerMetadata } from './get_service_overview_container_metadata';
import {
  getServiceTransactionTypes,
  ServiceTransactionTypesResponse,
} from './get_service_transaction_types';
import { getThroughput, ServiceThroughputResponse } from './get_throughput';
import { getServiceEntitySummary } from '../entities/get_service_entity_summary';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { createEntitiesESClient } from '../../lib/helpers/create_es_client/create_assets_es_client/create_assets_es_clients';

const servicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services',
  params: t.type({
    query: t.intersection([
      t.partial({
        searchQuery: t.string,
        serviceGroup: t.string,
      }),
      t.intersection([
        probabilityRt,
        t.intersection([
          serviceTransactionDataSourceRt,
          t.type({
            useDurationSummary: toBooleanRt,
          }),
        ]),
        environmentRt,
        kueryRt,
        rangeRt,
      ]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<ServicesItemsResponse> {
    const {
      context,
      params,
      logger,
      request,
      plugins: { security },
    } = resources;

    const {
      searchQuery,
      environment,
      kuery,
      start,
      end,
      serviceGroup: serviceGroupId,
      probability,
      documentType,
      rollupInterval,
      useDurationSummary,
    } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;

    const [mlClient, apmEventClient, apmAlertsClient, serviceGroup, randomSampler] =
      await Promise.all([
        getMlClient(resources),
        getApmEventClient(resources),
        getApmAlertsClient(resources),
        serviceGroupId
          ? getServiceGroup({ savedObjectsClient, serviceGroupId })
          : Promise.resolve(null),
        getRandomSampler({ security, request, probability }),
      ]);

    return getServicesItems({
      environment,
      kuery,
      mlClient,
      apmEventClient,
      apmAlertsClient,
      logger,
      start,
      end,
      serviceGroup,
      randomSampler,
      documentType,
      rollupInterval,
      useDurationSummary,
      searchQuery,
    });
  },
});

const servicesDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/services/detailed_statistics',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.intersection([offsetRt, probabilityRt, serviceTransactionDataSourceRt]),
      t.type({
        bucketSizeInSeconds: toNumberRt,
      }),
    ]),
    body: t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceTransactionDetailedStatPeriodsResponse> => {
    const {
      params,
      request,
      plugins: { security },
    } = resources;

    const {
      environment,
      kuery,
      offset,
      start,
      end,
      probability,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    const { serviceNames } = params.body;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    if (!serviceNames.length) {
      throw Boom.badRequest(`serviceNames cannot be empty`);
    }

    return getServiceTransactionDetailedStatsPeriods({
      environment,
      kuery,
      apmEventClient,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
      offset,
      serviceNames,
      start,
      end,
      randomSampler,
    });
  },
});

const serviceMetadataDetailsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metadata/details',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceMetadataDetails> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end, environment } = params.query;

    const serviceMetadataDetails = await getServiceMetadataDetails({
      serviceName,
      environment,
      apmEventClient,
      start,
      end,
    });

    if (serviceMetadataDetails?.container?.ids) {
      const infraMetricsClient = createInfraMetricsClient(resources);
      const containerMetadata = await getServiceOverviewContainerMetadata({
        infraMetricsClient,
        containerIds: serviceMetadataDetails.container.ids,
        start,
        end,
      });

      return mergeWith(serviceMetadataDetails, containerMetadata);
    }

    return serviceMetadataDetails;
  },
});

const serviceMetadataIconsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/metadata/icons',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceMetadataIcons> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery: '',
    });

    return getServiceMetadataIcons({
      serviceName,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
    });
  },
});

const serviceAgentRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/agent',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceAgentResponse> => {
    const { context, request } = resources;
    const coreContext = await context.core;

    const [apmEventClient, entitiesESClient] = await Promise.all([
      getApmEventClient(resources),
      createEntitiesESClient({
        request,
        esClient: coreContext.elasticsearch.client.asCurrentUser,
      }),
    ]);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const [apmServiceAgent, serviceEntitySummary] = await Promise.all([
      getServiceAgent({
        serviceName,
        apmEventClient,
        start,
        end,
      }),
      getServiceEntitySummary({
        end,
        start,
        serviceName,
        entitiesESClient,
        environment: ENVIRONMENT_ALL.value,
      }),
    ]);

    return isEmpty(apmServiceAgent)
      ? { agentName: serviceEntitySummary?.agentName }
      : apmServiceAgent;
  },
});

const serviceTransactionTypesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([rangeRt, serviceTransactionDataSourceRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceTransactionTypesResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end, documentType, rollupInterval } = params.query;

    return getServiceTransactionTypes({
      serviceName,
      apmEventClient,
      start,
      end,
      documentType,
      rollupInterval,
    });
  },
});

const serviceNodeMetadataRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt, serviceTransactionDataSourceRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceNodeMetadataResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName, serviceNodeName } = params.path;
    const { kuery, start, end, environment, documentType, rollupInterval } = params.query;

    return getServiceNodeMetadata({
      kuery,
      apmEventClient,
      serviceName,
      serviceNodeName,
      start,
      end,
      environment,
      documentType,
      rollupInterval,
    });
  },
});

const serviceAnnotationsRoute = createApmServerRoute({
  endpoint: 'GET /api/apm/services/{serviceName}/annotation/search 2023-10-31',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt]),
  }),
  options: { tags: ['access:apm', 'oas-tag:APM annotations'] },
  handler: async (resources): Promise<ServiceAnnotationResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, plugins, context, request, logger, config } = resources;
    const { serviceName } = params.path;
    const { environment, start, end } = params.query;
    const esClient = (await context.core).elasticsearch.client;

    const { observability } = plugins;

    const [annotationsClient, searchAggregatedTransactions] = await Promise.all([
      observability
        ? withApmSpan(
            'get_scoped_annotations_client',
            (): Promise<undefined | ScopedAnnotationsClient> =>
              observability.setup.getScopedAnnotationsClient(context, request)
          )
        : undefined,
      getSearchTransactionsEvents({
        apmEventClient,
        config,
        start,
        end,
        kuery: '',
      }),
    ]);

    return getServiceAnnotations({
      environment,
      apmEventClient,
      searchAggregatedTransactions,
      serviceName,
      annotationsClient,
      client: esClient.asCurrentUser,
      logger,
      start,
      end,
    });
  },
});

const serviceAnnotationsCreateRoute = createApmServerRoute({
  endpoint: 'POST /api/apm/services/{serviceName}/annotation 2023-10-31',
  options: {
    tags: ['access:apm', 'access:apm_write', 'oas-tag:APM annotations'],
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
  handler: async (
    resources
  ): Promise<{
    _id: string;
    _index: string;
    _source: Annotation;
  }> => {
    const {
      request,
      context,
      plugins: { observability },
      params,
    } = resources;

    const annotationsClient = observability
      ? await withApmSpan(
          'get_scoped_annotations_client',
          (): Promise<undefined | ScopedAnnotationsClient> =>
            observability.setup.getScopedAnnotationsClient(context, request)
        )
      : undefined;

    if (!annotationsClient) {
      throw Boom.notFound();
    }

    const { body, path } = params;

    return withApmSpan(
      'create_annotation',
      (): Promise<{ _id: string; _index: string; _source: Annotation }> =>
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

const serviceThroughputRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/throughput',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({ transactionType: t.string, bucketSizeInSeconds: toNumberRt }),
      t.partial({ transactionName: t.string, filters: filtersRt }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt, serviceTransactionDataSourceRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: ServiceThroughputResponse;
    previousPeriod: ServiceThroughputResponse;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      filters,
      transactionType,
      transactionName,
      offset,
      start,
      end,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    } = params.query;

    const commonProps = {
      environment,
      kuery,
      filters,
      serviceName,
      apmEventClient,
      transactionType,
      transactionName,
      documentType,
      rollupInterval,
      bucketSizeInSeconds,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getThroughput({
        ...commonProps,
        start,
        end,
      }),
      offset
        ? getThroughput({
            ...commonProps,
            start,
            end,
            offset,
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
  endpoint: 'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        transactionType: t.string,
        sortField: instancesSortFieldRt,
        sortDirection: t.union([t.literal('asc'), t.literal('desc')]),
      }),
      offsetRt,
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: ServiceInstanceMainStatisticsResponse;
    previousPeriod: ServiceInstanceMainStatisticsResponse;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      latencyAggregationType,
      offset,
      start,
      end,
      sortField,
      sortDirection,
    } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    const commonParams = {
      environment,
      kuery,
      latencyAggregationType,
      serviceName,
      apmEventClient,
      transactionType,
      searchAggregatedTransactions,
      start,
      end,
      sortField,
      sortDirection,
    };

    const [currentPeriod, previousPeriod] = await Promise.all([
      getServiceInstancesMainStatistics(commonParams),
      ...(offset ? [getServiceInstancesMainStatistics({ ...commonParams, offset })] : []),
    ]);

    return { currentPeriod, previousPeriod };
  },
});

const serviceInstancesDetailedStatisticsRoute = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/service_overview_instances/detailed_statistics',
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
      offsetRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceInstancesDetailedStatisticsResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      offset,
      serviceNodeIds,
      numBuckets,
      latencyAggregationType,
      start,
      end,
    } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      kuery,
      start,
      end,
    });

    return getServiceInstancesDetailedStatisticsPeriods({
      environment,
      kuery,
      latencyAggregationType,
      serviceName,
      apmEventClient,
      transactionType,
      searchAggregatedTransactions,
      numBuckets,
      serviceNodeIds,
      offset,
      start,
      end,
    });
  },
});

export const serviceInstancesMetadataDetails = createApmServerRoute({
  endpoint:
    'GET /internal/apm/services/{serviceName}/service_overview_instances/details/{serviceNodeName}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    ServiceInstanceMetadataDetailsResponse & (ServiceInstanceContainerMetadataDetails | {})
  > => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName, serviceNodeName } = params.path;
    const { start, end } = params.query;

    const serviceInstanceMetadataDetails = await getServiceInstanceMetadataDetails({
      apmEventClient,
      serviceName,
      serviceNodeName,
      start,
      end,
    });

    if (serviceInstanceMetadataDetails?.container?.id) {
      const infraMetricsClient = createInfraMetricsClient(resources);
      const containerMetadata = await getServiceInstanceContainerMetadata({
        infraMetricsClient,
        containerId: serviceInstanceMetadataDetails.container.id,
        start,
        end,
      });

      return mergeWith(serviceInstanceMetadataDetails, containerMetadata);
    }

    return serviceInstanceMetadataDetails;
  },
});

export const serviceDependenciesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
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
  async handler(resources): Promise<{ serviceDependencies: ServiceDependenciesResponse }> {
    const {
      params,
      request,
      plugins: { security },
    } = resources;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability: 1 }),
    ]);

    const { serviceName } = params.path;
    const { environment, numBuckets, start, end, offset } = params.query;

    return {
      serviceDependencies: await getServiceDependencies({
        apmEventClient,
        start,
        end,
        serviceName,
        environment,
        numBuckets,
        offset,
        randomSampler,
      }),
    };
  },
});

export const serviceDependenciesBreakdownRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/dependencies/breakdown',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt, kueryRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    breakdown: ServiceDependenciesBreakdownResponse;
  }> => {
    const {
      params,
      request,
      plugins: { security },
    } = resources;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability: 1 }),
    ]);

    const { serviceName } = params.path;
    const { environment, start, end, kuery } = params.query;

    const breakdown = await getServiceDependenciesBreakdown({
      apmEventClient,
      start,
      end,
      serviceName,
      environment,
      kuery,
      randomSampler,
    });

    return {
      breakdown,
    };
  },
});

const serviceAnomalyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([rangeRt, environmentRt, t.type({ transactionType: t.string })]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    allAnomalyTimeseries: ServiceAnomalyTimeseries[];
  }> => {
    const mlClient = await getMlClient(resources);

    if (!mlClient) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const {
      path: { serviceName },
      query: { start, end, transactionType, environment },
    } = resources.params;

    try {
      const allAnomalyTimeseries = await getAnomalyTimeseries({
        serviceName,
        transactionType,
        start,
        end,
        mlClient,
        logger: resources.logger,
        environment,
      });

      return {
        allAnomalyTimeseries,
      };
    } catch (error) {
      if (
        error instanceof UnknownMLCapabilitiesError ||
        error instanceof InsufficientMLCapabilities ||
        error instanceof MLPrivilegesUninitialized
      ) {
        throw Boom.forbidden(error.message);
      }
      throw error;
    }
  },
});

const serviceAlertsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<ServiceAlertsResponse[number]> => {
    const { params } = resources;
    const {
      query: { start, end, environment },
    } = params;
    const { serviceName } = params.path;

    const apmAlertsClient = await getApmAlertsClient(resources);
    const servicesAlerts = await getServicesAlerts({
      serviceName,
      apmAlertsClient,
      environment,
      start,
      end,
    });

    return servicesAlerts.length > 0 ? servicesAlerts[0] : { serviceName, alertsCount: 0 };
  },
});

export const serviceRouteRepository = {
  ...servicesRoute,
  ...servicesDetailedStatisticsRoute,
  ...serviceMetadataDetailsRoute,
  ...serviceMetadataIconsRoute,
  ...serviceAgentRoute,
  ...serviceTransactionTypesRoute,
  ...serviceNodeMetadataRoute,
  ...serviceAnnotationsRoute,
  ...serviceAnnotationsCreateRoute,
  ...serviceInstancesMetadataDetails,
  ...serviceThroughputRoute,
  ...serviceInstancesMainStatisticsRoute,
  ...serviceInstancesDetailedStatisticsRoute,
  ...serviceDependenciesRoute,
  ...serviceDependenciesBreakdownRoute,
  ...serviceAnomalyChartsRoute,
  ...serviceAlertsRoute,
};
