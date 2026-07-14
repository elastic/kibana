/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import {
  rangeSchema,
  routeDefinitions,
  type ServiceAgentResponse,
  type ServiceAlertsCountRouteResponse,
  type ServiceAnnotationResponse,
  type ServiceAnomalyChartsResponse,
  type ServiceDependenciesBreakdownRouteResponse,
  type ServiceDependenciesRouteResponse,
  type ServiceInstancesDetailedStatisticsResponse,
  type ServiceInstancesMainStatisticsRouteResponse,
  type ServiceInstancesMetadataDetailsRouteResponse,
  type ServiceMetadataDetails,
  type ServiceMetadataIcons,
  type ServiceMixedIngestionResponse,
  type ServiceNodeMetadataResponse,
  type ServicesItemsResponse,
  type ServiceSlosResponse,
  type ServiceThroughputRouteResponse,
  type ServiceTransactionDetailedStatPeriodsResponse,
  type ServiceTransactionTypesResponse,
  type ServiceAnomalyScoreResponse,
} from '@kbn/apm-api-shared';
import { isoToEpoch } from '@kbn/zod-helpers/v4';
import {
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
  UnknownMLCapabilitiesError,
} from '@kbn/ml-plugin/server';
import type { Annotation } from '@kbn/observability-plugin/common/annotations';
import type { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { z } from '@kbn/zod/v4';
import { mergeWith, uniq } from 'lodash';
import { environmentSchema } from '@kbn/apm-types';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { getAnomalyTimeseries } from '../../lib/anomaly_detection/get_anomaly_timeseries';
import { createInfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
import { getApmAlertsClient } from '../../lib/helpers/get_apm_alerts_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { getApmSloClient } from '../../lib/helpers/get_apm_slo_client';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { getSloAlertsClient } from '../../lib/helpers/get_slo_alerts_client';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getServiceGroup } from '../service_groups/get_service_group';
import { getServiceAnnotations } from './annotations';
import { getServiceAgent } from './get_service_agent';
import { getServiceDependencies } from './get_service_dependencies';
import { getServiceDependenciesBreakdown } from './get_service_dependencies_breakdown';
import { getServiceHasSystemMetrics } from './get_service_has_system_metrics';
import { getServiceInstanceContainerMetadata } from './get_service_instance_container_metadata';
import { getServiceInstanceMetadataDetails } from './get_service_instance_metadata_details';
import { getServiceInstancesDetailedStatisticsPeriods } from './get_service_instances/detailed_statistics';
import { getServiceInstancesMainStatistics } from './get_service_instances/main_statistics';
import { getServiceMetadataDetails } from './get_service_metadata_details';
import { getServiceMetadataIcons } from './get_service_metadata_icons';
import { getServiceMixedIngestion } from './get_service_mixed_ingestion';
import { getServiceNodeMetadata } from './get_service_node_metadata';
import { getServiceOverviewContainerMetadata } from './get_service_overview_container_metadata';
import { getServiceSlos } from './get_service_slos';
import { getServiceTransactionTypes } from './get_service_transaction_types';
import { getServicesAlerts } from './get_services/get_service_alerts';
import { getServiceAnomalyScoreForService } from './get_services/get_service_anomaly_score_for_service';
import { getServicesItems } from './get_services/get_services_items';
import { getServiceTransactionDetailedStatsPeriods } from './get_services_detailed_statistics/get_service_transaction_detailed_statistics';
import { getThroughput } from './get_throughput';

// Bounds the serviceName path param to satisfy the CodeQL "unbounded string in
// route validation" rule; 1024 matches the ES keyword default `ignore_above`.
const MAX_SERVICE_NAME_LENGTH = 1024;

const servicesRoute = createApmServerRoute({
  endpoint: routeDefinitions.services.servicesList.endpoint,
  params: routeDefinitions.services.servicesList.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources): Promise<ServicesItemsResponse> {
    const { context, params, logger, request, core } = resources;

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

    const coreStart = await core.start();

    const [mlClient, apmEventClient, apmAlertsClient, sloClient, serviceGroup, randomSampler] =
      await Promise.all([
        getMlClient(resources),
        getApmEventClient(resources),
        getApmAlertsClient(resources),
        getApmSloClient(resources),
        serviceGroupId
          ? getServiceGroup({ savedObjectsClient, serviceGroupId })
          : Promise.resolve(null),
        getRandomSampler({ coreStart, request, probability }),
      ]);

    return getServicesItems({
      environment,
      kuery,
      mlClient,
      apmEventClient,
      apmAlertsClient,
      sloClient,
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
  endpoint: routeDefinitions.services.detailedStatistics.endpoint,
  params: routeDefinitions.services.detailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceTransactionDetailedStatPeriodsResponse> => {
    const { params, request, core } = resources;

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

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability }),
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
  endpoint: routeDefinitions.services.metadataDetails.endpoint,
  params: routeDefinitions.services.metadataDetails.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.services.metadataIcons.endpoint,
  params: routeDefinitions.services.metadataIcons.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.services.agent.endpoint,
  params: routeDefinitions.services.agent.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceAgentResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    const apmServiceAgent = await getServiceAgent({
      serviceName,
      apmEventClient,
      start,
      end,
    });

    return apmServiceAgent;
  },
});

const serviceMixedIngestionRoute = createApmServerRoute({
  endpoint: routeDefinitions.services.mixedIngestion.endpoint,
  params: routeDefinitions.services.mixedIngestion.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMixedIngestionResponse> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, kuery, start, end } = params.query;

    return getServiceMixedIngestion({
      serviceName,
      apmEventClient,
      start,
      end,
      environment,
      kuery,
    });
  },
});

const serviceTransactionTypesRoute = createApmServerRoute({
  endpoint: routeDefinitions.services.transactionTypes.endpoint,
  params: routeDefinitions.services.transactionTypes.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.services.nodeMetadata.endpoint,
  params: routeDefinitions.services.nodeMetadata.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.services.annotationsSearch.endpoint,
  params: routeDefinitions.services.annotationsSearch.params,
  options: { tags: ['oas-tag:APM annotations'] },
  security: {
    authz: {
      requiredPrivileges: ['apm'],
    },
  },
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
    tags: ['oas-tag:APM annotations'],
  },
  security: {
    authz: {
      requiredPrivileges: ['apm', 'apm_write'],
    },
  },
  params: z.object({
    path: z.object({
      serviceName: z.string().max(MAX_SERVICE_NAME_LENGTH),
    }),
    body: z
      .object({
        '@timestamp': z.string().max(1024).transform(isoToEpoch),
        service: z
          .object({
            version: z.string().max(1024),
          })
          .merge(
            z.object({
              environment: z.string().max(1024).optional(),
            })
          ),
      })
      .merge(
        z.object({
          message: z.string().max(10_000).optional(),
          tags: z.array(z.string().max(1024)).optional(),
        })
      ),
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
  endpoint: routeDefinitions.services.throughput.endpoint,
  params: routeDefinitions.services.throughput.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceThroughputRouteResponse> => {
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
  endpoint: routeDefinitions.services.instancesMainStatistics.endpoint,
  params: routeDefinitions.services.instancesMainStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceInstancesMainStatisticsRouteResponse> => {
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
  endpoint: routeDefinitions.services.instancesDetailedStatistics.endpoint,
  params: routeDefinitions.services.instancesDetailedStatistics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
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
  endpoint: routeDefinitions.services.instancesMetadataDetails.endpoint,
  params: routeDefinitions.services.instancesMetadataDetails.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceInstancesMetadataDetailsRouteResponse> => {
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
  endpoint: routeDefinitions.services.dependencies.endpoint,
  params: routeDefinitions.services.dependencies.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  async handler(resources): Promise<ServiceDependenciesRouteResponse> {
    const { params, request, core } = resources;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability: 1 }),
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
  endpoint: routeDefinitions.services.dependenciesBreakdown.endpoint,
  params: routeDefinitions.services.dependenciesBreakdown.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceDependenciesBreakdownRouteResponse> => {
    const { params, request, core } = resources;

    const coreStart = await core.start();
    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ coreStart, request, probability: 1 }),
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
  endpoint: routeDefinitions.services.anomalyCharts.endpoint,
  params: routeDefinitions.services.anomalyCharts.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceAnomalyChartsResponse> => {
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
  endpoint: routeDefinitions.services.alertsCount.endpoint,
  params: routeDefinitions.services.alertsCount.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceAlertsCountRouteResponse> => {
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

const serviceAnomalyScoreRoute = createApmServerRoute({
  endpoint: routeDefinitions.services.anomalyScore.endpoint,
  params: routeDefinitions.services.anomalyScore.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceAnomalyScoreResponse> => {
    const mlClient = await getMlClient(resources);
    if (!mlClient) {
      return {};
    }

    const { path, query } = resources.params;
    const { serviceName } = path;
    const { start, end, environment } = query;

    try {
      return await getServiceAnomalyScoreForService({
        mlClient,
        environment,
        start,
        end,
        serviceName,
      });
    } catch (error) {
      if (
        (Boom.isBoom(error) && error.output.statusCode === 501) ||
        error instanceof UnknownMLCapabilitiesError ||
        error instanceof InsufficientMLCapabilities ||
        error instanceof MLPrivilegesUninitialized
      ) {
        return {};
      }
      throw error;
    }
  },
});

const serviceSlosRoute = createApmServerRoute({
  endpoint: routeDefinitions.services.slos.endpoint,
  params: routeDefinitions.services.slos.params,
  security: { authz: { requiredPrivileges: ['apm', 'slo_read'] } },
  async handler(resources): Promise<ServiceSlosResponse> {
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, page, perPage, statusFilters, kqlQuery } = params.query;

    const [sloClient, sloAlertsClient] = await Promise.all([
      getApmSloClient(resources),
      getSloAlertsClient(resources),
    ]);

    return getServiceSlos({
      sloClient,
      sloAlertsClient,
      serviceName,
      environment,
      statusFilters,
      kqlQuery,
      page,
      perPage,
    });
  },
});

const serviceHasSystemMetricsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/has_system_metrics',
  params: z.object({
    path: z.object({ serviceName: z.string().max(MAX_SERVICE_NAME_LENGTH) }),
    query: environmentSchema.merge(rangeSchema),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<{ hasSystemMetrics: boolean }> => {
    const apmEventClient = await getApmEventClient(resources);
    const {
      path: { serviceName },
      query: { environment, start, end },
    } = resources.params;

    return getServiceHasSystemMetrics({ apmEventClient, serviceName, environment, start, end });
  },
});

export const serviceRouteRepository = {
  ...servicesRoute,
  ...servicesDetailedStatisticsRoute,
  ...serviceMetadataDetailsRoute,
  ...serviceMetadataIconsRoute,
  ...serviceAgentRoute,
  ...serviceMixedIngestionRoute,
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
  ...serviceAnomalyScoreRoute,
  ...serviceSlosRoute,
  ...serviceHasSystemMetricsRoute,
};
