/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { isoToEpochRt, jsonRt, toNumberRt } from '@kbn/io-ts-utils';
import * as t from 'io-ts';
import { uniq } from 'lodash';
import {
  UnknownMLCapabilitiesError,
  InsufficientMLCapabilities,
  MLPrivilegesUninitialized,
} from '@kbn/ml-plugin/server';
import { ScopedAnnotationsClient } from '@kbn/observability-plugin/server';
import { Annotation } from '@kbn/observability-plugin/common/annotations';
import { latencyAggregationTypeRt } from '../../../common/latency_aggregation_types';
import { ProfilingValueType } from '../../../common/profiling';
import { getSearchAggregatedTransactions } from '../../lib/helpers/transactions';
import { setupRequest } from '../../lib/helpers/setup_request';
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
import { getServiceProfilingStatistics } from './profiling/get_service_profiling_statistics';
import { getServiceProfilingTimeline } from './profiling/get_service_profiling_timeline';
import { getServiceInfrastructure } from './get_service_infrastructure';
import { withApmSpan } from '../../utils/with_apm_span';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, kueryRt, rangeRt } from '../default_api_types';
import { offsetPreviousPeriodCoordinates } from '../../../common/utils/offset_previous_period_coordinate';
import { getServicesDetailedStatistics } from './get_services_detailed_statistics';
import { getServiceDependenciesBreakdown } from './get_service_dependencies_breakdown';
import { getAnomalyTimeseries } from '../../lib/anomaly_detection/get_anomaly_timeseries';
import { getServiceInstancesDetailedStatisticsPeriods } from './get_service_instances/detailed_statistics';
import { ML_ERRORS } from '../../../common/anomaly_detection';
import { ConnectionStatsItemWithImpact } from '../../../common/connections';
import { getSortedAndFilteredServices } from './get_services/get_sorted_and_filtered_services';
import { ServiceHealthStatus } from '../../../common/service_health_status';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/offset_rt';

const servicesRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services',
  params: t.type({
    query: t.intersection([
      environmentRt,
      kueryRt,
      rangeRt,
      t.partial({ serviceGroup: t.string }),
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
    const { context, params, logger } = resources;
    const {
      environment,
      kuery,
      start,
      end,
      serviceGroup: serviceGroupId,
    } = params.query;
    const savedObjectsClient = (await context.core).savedObjects.client;

    const [setup, serviceGroup] = await Promise.all([
      setupRequest(resources),
      serviceGroupId
        ? getServiceGroup({ savedObjectsClient, serviceGroupId })
        : Promise.resolve(null),
    ]);
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });
    return getServices({
      environment,
      kuery,
      setup,
      searchAggregatedTransactions,
      logger,
      start,
      end,
      serviceGroup,
    });
  },
});

const servicesDetailedStatisticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/detailed_statistics',
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
  endpoint: 'GET /internal/apm/services/{serviceName}/metadata/icons',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: rangeRt,
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<import('./get_service_metadata_icons').ServiceMetadataIcons> => {
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
    const setup = await setupRequest(resources);
    const { params } = resources;
    const { serviceName } = params.path;
    const { start, end } = params.query;

    return getServiceAgent({
      serviceName,
      setup,
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
    'GET /internal/apm/services/{serviceName}/node/{serviceNodeName}/metadata',
  params: t.type({
    path: t.type({
      serviceName: t.string,
      serviceNodeName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ host: string | number; containerId: string | number }> => {
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
  handler: async (
    resources
  ): Promise<{
    annotations: Array<import('./../../../common/annotations').Annotation>;
  }> => {
    const setup = await setupRequest(resources);
    const { params, plugins, context, request, logger } = resources;
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
    const setup = await setupRequest(resources);
    const { params } = resources;
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
    const searchAggregatedTransactions = await getSearchAggregatedTransactions({
      ...setup,
      kuery,
      start,
      end,
    });

    const commonProps = {
      environment,
      kuery,
      searchAggregatedTransactions,
      serviceName,
      setup,
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
    const setup = await setupRequest(resources);
    const { params } = resources;
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
      ...(offset
        ? [
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
    const setup = await setupRequest(resources);
    const { params } = resources;
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
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/timeline',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, kueryRt, rangeRt]),
  }),
  options: {
    tags: ['access:apm'],
  },
  handler: async (
    resources
  ): Promise<{
    profilingTimeline: Array<{
      x: number;
      valueTypes: {
        wall_time: number;
        cpu_time: number;
        samples: number;
        alloc_objects: number;
        alloc_space: number;
        inuse_objects: number;
        inuse_space: number;
        unknown: number;
      };
    }>;
  }> => {
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
  endpoint: 'GET /internal/apm/services/{serviceName}/profiling/statistics',
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
  handler: async (
    resources
  ): Promise<{
    nodes: Record<string, import('./../../../common/profiling').ProfileNode>;
    rootNodes: string[];
  }> => {
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

const serviceInfrastructureRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([kueryRt, rangeRt, environmentRt]),
  }),
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    serviceInfrastructure: { containerIds: string[]; hostNames: string[] };
  }> => {
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

const serviceAnomalyChartsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/services/{serviceName}/anomaly_charts',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([rangeRt, t.type({ transactionType: t.string })]),
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
    const setup = await setupRequest(resources);

    if (!setup.ml) {
      throw Boom.notImplemented(ML_ERRORS.ML_NOT_AVAILABLE);
    }

    const {
      path: { serviceName },
      query: { start, end, transactionType },
    } = resources.params;

    try {
      const allAnomalyTimeseries = await getAnomalyTimeseries({
        serviceName,
        transactionType,
        start,
        end,
        mlSetup: setup.ml,
        logger: resources.logger,
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

    const savedObjectsClient = (await resources.context.core).savedObjects
      .client;

    const [setup, serviceGroup] = await Promise.all([
      setupRequest(resources),
      serviceGroupId
        ? getServiceGroup({ savedObjectsClient, serviceGroupId })
        : Promise.resolve(null),
    ]);
    return {
      services: await getSortedAndFilteredServices({
        setup,
        start,
        end,
        environment,
        logger: resources.logger,
        serviceGroup,
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
  ...serviceProfilingTimelineRoute,
  ...serviceProfilingStatisticsRoute,
  ...serviceInfrastructureRoute,
  ...serviceAnomalyChartsRoute,
  ...sortedAndFilteredServicesRoute,
};
