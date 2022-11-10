/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isoToEpochRt, jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import { enableServiceMetrics } from '@kbn/observability-plugin/common';
import * as t from 'io-ts';
import { uniq, mergeWith } from 'lodash';
import {
  UnknownMLCapabilitiesError,
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
} from '@kbn/ml-plugin/server';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { Annotation } from '@kbn/observability-plugin/common/annotations';
import { apmServiceGroupMaxNumberOfServices } from '@kbn/observability-plugin/common';
import { latencyAggregationTypeRt } from '../../../common/latency_aggregation_types';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getServiceInventorySearchSource } from '../../lib/helpers/get_service_inventory_search_source';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getServiceAnnotations } from './annotations';
import { getServices } from './get_services';
import { getServiceAgent } from './get_service_agent';
import { getServiceDependencies } from './get_service_dependencies';
import { getServiceInstanceMetadataDetails } from './get_service_instance_metadata_details';
import { getServiceInstancesMainStatistics } from './get_service_instances/main_statistics';
import { getServiceMetadataDetails } from './get_service_metadata_details';
import { getServiceMetadataIcons } from './get_service_metadata_icons';
import { getServiceNodeMetadata } from './get_service_node_metadata';
import { getServiceTransactionTypes } from './get_service_transaction_types';
import { getThroughput } from './get_throughput';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  environmentRt,
  kueryRt,
  rangeRt,
  probabilityRt,
} from '../default_api_types';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { getServiceOverviewContainerMetadata } from './get_service_overview_container_metadata';
import { getServiceInstanceContainerMetadata } from './get_service_instance_container_metadata';
import { getServicesDetailedStatistics } from './get_services_detailed_statistics';
import { getServiceDependenciesBreakdown } from './get_service_dependencies_breakdown';
import { getAnomalyTimeseries } from '../../lib/anomaly_detection/get_anomaly_timeseries';
import { getServiceInstancesDetailedStatisticsPeriods } from './get_service_instances/detailed_statistics';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { getSortedAndFilteredServices } from './get_services/get_sorted_and_filtered_services';
import { ServiceHealthStatus } from '../../../common/service_health_status';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/comparison_rt';
import { getRandomSampler } from '../../lib/helpers/get_random_sampler';
import { createInfraMetricsClient } from '../../lib/helpers/create_es_client/create_infra_metrics_client/create_infra_metrics_client';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

const servicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.partial({ serviceGroup: t.string }),
      probabilityRt,
    ]),
  }),
  options: { tags: ['access:apm'] },
  async handler(resources): Promise<{
    items: import('./../../../common/utils/join_by_key/index').JoinedReturnType<
      | {
          serviceName: string;
          transactionType: string;
          environments: string[];
          agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
          latency: number | null;
          transactionErrorRate: number;
          throughput: number;
        }
      | {
          serviceName: string;
          environments: string[];
          agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
        }
      | {
          serviceName: string;
          healthStatus: import('./../../../common/service_health_status').ServiceHealthStatus;
        },
      {
        serviceName: string;
        transactionType: string;
        environments: string[];
        agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
        latency: number | null;
        transactionErrorRate: number;
        throughput: number;
      } & {
        serviceName: string;
        environments: string[];
        agentName: import('./../../../typings/es_schemas/ui/fields/agent').AgentName;
      } & {
        serviceName: string;
        healthStatus: import('./../../../common/service_health_status').ServiceHealthStatus;
      }
    >;
  }> {
    const {
      config,
      context,
      params,
      logger,
      request,
      plugins: { security },
    } = resources;

    const {
      environment,
      kuery,
      start,
      end,
      serviceGroup: serviceGroupId,
      probability,
    } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;
    const coreContext = await resources.context.core;

    const [mlClient, apmEventClient, serviceGroup, randomSampler] =
      await Promise.all([
        getMlClient(resources),
        getApmEventClient(resources),
        serviceGroupId
          ? getServiceGroup({ savedObjectsClient, serviceGroupId })
          : Promise.resolve(null),
        getRandomSampler({ security, request, probability }),
      ]);

    const serviceMetricsEnabled =
      await coreContext.uiSettings.client.get<boolean>(enableServiceMetrics);

    const { searchAggregatedTransactions, searchAggregatedServiceMetrics } =
      await getServiceInventorySearchSource({
        serviceMetricsEnabled,
        config,
        apmEventClient,
        kuery,
        start,
        end,
      });

    return getServices({
      environment,
      kuery,
      mlClient,
      apmEventClient,
      searchAggregatedTransactions,
      searchAggregatedServiceMetrics,
      logger,
      start,
      end,
      serviceGroup,
      randomSampler,
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
      offsetRt,
      probabilityRt,
    ]),
    body: t.type({ serviceNames: jsonRt.pipe(t.array(t.string)) }),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      serviceName: string;
      latency: Array<{
        x: number;
        y: number | null;
      }>;
      transactionErrorRate: Array<{
        x: number;
        y: number;
      }>;
      throughput: Array<{
        x: number;
        y: number;
      }>;
    }>;
    previousPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      serviceName: string;
      latency: Array<{
        x: number;
        y: number | null;
      }>;
      transactionErrorRate: Array<{
        x: number;
        y: number;
      }>;
      throughput: Array<{
        x: number;
        y: number;
      }>;
    }>;
  }> => {
    const {
      config,
      params,
      request,
      plugins: { security },
    } = resources;
    const coreContext = await resources.context.core;

    const { environment, kuery, offset, start, end, probability } =
      params.query;

    const { serviceNames } = params.body;

    const [apmEventClient, randomSampler] = await Promise.all([
      getApmEventClient(resources),
      getRandomSampler({ security, request, probability }),
    ]);

    const serviceMetricsEnabled =
      await coreContext.uiSettings.client.get<boolean>(enableServiceMetrics);

    const { searchAggregatedTransactions, searchAggregatedServiceMetrics } =
      await getServiceInventorySearchSource({
        serviceMetricsEnabled,
        config,
        apmEventClient,
        kuery,
        start,
        end,
      });

    if (!serviceNames.length) {
      throw Boom.badRequest(`serviceNames cannot be empty`);
    }

    return getServicesDetailedStatistics({
      environment,
      kuery,
      apmEventClient,
      searchAggregatedTransactions,
      searchAggregatedServiceMetrics,
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
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<
    import('./get_service_metadata_details').ServiceMetadataDetails
  > => {
    const apmEventClient = await getApmEventClient(resources);
    const infraMetricsClient = createInfraMetricsClient(resources);
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

    const serviceMetadataDetails = await getServiceMetadataDetails({
      serviceName,
      apmEventClient,
      searchAggregatedTransactions,
      start,
      end,
    });

    if (serviceMetadataDetails?.container?.ids) {
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
  handler: async (
    resources
  ): Promise<import('./get_service_metadata_icons').ServiceMetadataIcons> => {
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
  handler: async (
    resources
  ): Promise<
    | { agentName?: undefined; runtimeName?: undefined }
    | { agentName: string | undefined; runtimeName: string | undefined }
  > => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    return getServiceAgent({
      serviceName,
      apmEventClient,
      start,
      end,
    });
  },
});

const serviceTransactionTypesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (resources): Promise<{ transactionTypes: string[] }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    return getServiceTransactionTypes({
      serviceName,
      apmEventClient,
      searchAggregatedTransactions: await getSearchTransactionsEvents({
        apmEventClient,
        config,
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
    'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ host: string | number; containerId: string | number }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName, serviceNodeName } = params.path;
    const { kuery, start, end, environment } = params.query;

    return getServiceNodeMetadata({
      kuery,
      apmEventClient,
      serviceName,
      serviceNodeName,
      start,
      end,
      environment,
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
  handler: async (
    resources
  ): Promise<{
    annotations: Array<import('./../../../common/annotations').Annotation>;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, plugins, context, request, logger, config } = resources;
    const { serviceName } = params.path;
    const { environment, start, end } = params.query;
    const esClient = (await context.core).elasticsearch.client;

    const { observability } = plugins;

    const [annotationsClient, searchAggregatedTransactions] = await Promise.all(
      [
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
      ]
    );

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
  handler: async (
    resources
  ): Promise<{
    _id: string;
    _index: string;
    _source: import('./../../../../observability/common/annotations').Annotation;
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
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
    ]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    currentPeriod: Array<{ x: number; y: number | null }>;
    previousPeriod: Array<{
      x: number;
      y: import('./../../../typings/common').Maybe<number>;
    }>;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params, config } = resources;
    const { serviceName } = params.path;
    const {
      environment,
      kuery,
      transactionType,
      transactionName,
      offset,
      start,
      end,
    } = params.query;
    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
      kuery,
      start,
      end,
    });

    const commonProps = {
      environment,
      kuery,
      searchAggregatedTransactions,
      serviceName,
      apmEventClient,
      transactionType,
      transactionName,
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
  endpoint:
    'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      t.type({
        latencyAggregationType: latencyAggregationTypeRt,
        transactionType: t.string,
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
    currentPeriod: Array<{
      serviceNodeName: string;
      errorRate?: number | undefined;
      latency?: number | undefined;
      throughput?: number | undefined;
      cpuUsage?: number | null | undefined;
      memoryUsage?: number | null | undefined;
    }>;
    previousPeriod: Array<{
      serviceNodeName: string;
      errorRate?: number | undefined;
      latency?: number | undefined;
      throughput?: number | undefined;
      cpuUsage?: number | null | undefined;
      memoryUsage?: number | null | undefined;
    }>;
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
    } = params.query;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      config,
      apmEventClient,
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
        apmEventClient,
        transactionType,
        searchAggregatedTransactions,
        start,
        end,
      }),
      ...(offset
        ? [
            getServiceInstancesMainStatistics({
              environment,
              kuery,
              latencyAggregationType,
              serviceName,
              apmEventClient,
              transactionType,
              searchAggregatedTransactions,
              start,
              end,
              offset,
            }),
          ]
        : []),
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
  handler: async (
    resources
  ): Promise<{
    currentPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      serviceNodeName: string;
      errorRate?:
        | Array<import('./../../../typings/timeseries').Coordinate>
        | undefined;
      latency?:
        | Array<import('./../../../typings/timeseries').Coordinate>
        | undefined;
      throughput?:
        | Array<import('./../../../typings/timeseries').Coordinate>
        | undefined;
      cpuUsage?:
        | Array<import('./../../../typings/timeseries').Coordinate>
        | undefined;
      memoryUsage?:
        | Array<import('./../../../typings/timeseries').Coordinate>
        | undefined;
    }>;
    previousPeriod: import('./../../../../../../node_modules/@types/lodash/ts3.1/index').Dictionary<{
      cpuUsage: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      errorRate: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      latency: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      memoryUsage: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      throughput: Array<{
        x: number;
        y: import('./../../../typings/common').Maybe<number>;
      }>;
      serviceNodeName: string;
    }>;
  }> => {
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
  ): Promise<{
    '@timestamp': string;
    agent:
      | (import('./../../../typings/es_schemas/ui/fields/agent').Agent & {
          name: string;
          version: string;
        })
      | ({
          name: string;
          version: string;
        } & import('./../../../typings/es_schemas/ui/fields/agent').Agent);
    service:
      | import('./../../../typings/es_schemas/raw/fields/service').Service
      | (import('./../../../typings/es_schemas/raw/fields/service').Service & {
          name: string;
          node?: { name: string } | undefined;
          environment?: string | undefined;
          version?: string | undefined;
        })
      | (import('./../../../typings/es_schemas/raw/fields/service').Service & {
          node?: { name: string } | undefined;
        })
      | (import('./../../../typings/es_schemas/raw/fields/service').Service & {
          name: string;
          node?: { name: string } | undefined;
          environment?: string | undefined;
          version?: string | undefined;
        } & { node?: { name: string } | undefined })
      | (import('./../../../typings/es_schemas/raw/fields/service').Service & {
          node?: { name: string } | undefined;
        } & {
          name: string;
          node?: { name: string } | undefined;
          environment?: string | undefined;
          version?: string | undefined;
        });
    container:
      | import('./../../../typings/es_schemas/raw/fields/container').Container
      | undefined;
    kubernetes:
      | import('./../../../typings/es_schemas/raw/fields/kubernetes').Kubernetes
      | undefined;
    host:
      | import('./../../../typings/es_schemas/raw/fields/host').Host
      | undefined;
    cloud:
      | import('./../../../typings/es_schemas/raw/fields/cloud').Cloud
      | undefined;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const infraMetricsClient = createInfraMetricsClient(resources);
    const { params } = resources;
    const { serviceName, serviceNodeName } = params.path;
    const { start, end } = params.query;

    const serviceInstanceMetadataDetails =
      await getServiceInstanceMetadataDetails({
        apmEventClient,
        serviceName,
        serviceNodeName,
        start,
        end,
      });

    if (serviceInstanceMetadataDetails?.container?.id) {
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
  handler: async (
    resources
  ): Promise<{
    serviceDependencies: Array<{
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
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, numBuckets, start, end, offset } = params.query;

    const opts = {
      apmEventClient,
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
      serviceDependencies: currentPeriod.map(
        (
          item
        ): Omit<ConnectionStatsItemWithImpact, 'stats'> & {
          currentStats: ConnectionStatsItemWithImpact['stats'];
          previousStats: ConnectionStatsItemWithImpact['stats'] | null;
        } => {
          const { stats, ...rest } = item;
          const previousPeriodItem = previousPeriod.find(
            (prevItem): boolean => item.location.id === prevItem.location.id
          );

          return {
            ...rest,
            currentStats: stats,
            previousStats: previousPeriodItem?.stats || null,
          };
        }
      ),
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
    breakdown: Array<{ title: string; data: Array<{ x: number; y: number }> }>;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { environment, start, end, kuery } = params.query;

    const breakdown = await getServiceDependenciesBreakdown({
      apmEventClient,
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

const serviceAnomalyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([
      rangeRt,
      environmentRt,
      t.type({ transactionType: t.string }),
    ]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    allAnomalyTimeseries: Array<
      import('./../../../common/anomaly_detection/service_anomaly_timeseries').ServiceAnomalyTimeseries
    >;
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

const sortedAndFilteredServicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/sorted_and_filtered_services',
  options: {
    tags: ['access:apm'],
  },
  params: t.type({
    query: t.intersection([
      rangeRt,
      environmentRt,
      kueryRt,
      t.partial({ serviceGroup: t.string }),
    ]),
  }),
  handler: async (
    resources
  ): Promise<{
    services: Array<{
      serviceName: string;
      healthStatus?: ServiceHealthStatus;
    }>;
  }> => {
    const {
      query: { start, end, environment, kuery, serviceGroup: serviceGroupId },
    } = resources.params;

    if (kuery) {
      return {
        services: [],
      };
    }

    const {
      savedObjects: { client: savedObjectsClient },
      uiSettings: { client: uiSettingsClient },
    } = await resources.context.core;

    const [mlClient, apmEventClient, serviceGroup, maxNumberOfServices] =
      await Promise.all([
        getMlClient(resources),
        getApmEventClient(resources),
        serviceGroupId
          ? getServiceGroup({ savedObjectsClient, serviceGroupId })
          : Promise.resolve(null),
        uiSettingsClient.get<number>(apmServiceGroupMaxNumberOfServices),
      ]);
    return {
      services: await getSortedAndFilteredServices({
        mlClient,
        apmEventClient,
        start,
        end,
        environment,
        logger: resources.logger,
        serviceGroup,
        maxNumberOfServices,
      }),
    };
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
  ...sortedAndFilteredServicesRoute,
};
