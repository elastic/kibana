/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { apmServiceGroupMaxNumberOfServices } from '@kbn/observability-plugin/common';
import type { ServiceMapResponse } from '../../../common/service_map';
import { isActivePlatinumLicense } from '../../../common/license_check';
import { invalidLicenseMessage } from '../../../common/service_map/utils';
import { notifyFeatureUsage } from '../../feature';
import { getSearchTransactionsEvents } from '../../lib/helpers/transactions';
import { getMlClient } from '../../lib/helpers/get_ml_client';
import { getServiceMap } from './get_service_map';
import type { ServiceMapServiceDependencyInfoResponse } from './get_service_map_dependency_node_info';
import { getServiceMapDependencyNodeInfo } from './get_service_map_dependency_node_info';
import type { ServiceMapServiceNodeInfoResponse } from './get_service_map_service_node_info';
import { getServiceMapServiceNodeInfo } from './get_service_map_service_node_info';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { environmentRt, rangeRt, kueryRt } from '../default_api_types';
import { getServiceGroup } from '../service_groups/get_service_group';
import { offsetRt } from '../../../common/comparison_rt';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import {
  getLastProcessedTimestamp,
  getMinMaxSpanTimestamp,
  updateLastProcessedTimestamp,
  calculateTimeWindows,
  processChunksWithConcurrencyLimit,
  aggregateChunkResults,
  filterUnprocessedWindows,
} from './workflow/core';
import {
  resolveServiceMapDestinations,
  type ResolveServiceMapDestinationsResponse,
} from './workflow/resolution';
import { cleanupServiceMapEdges, type CleanupServiceMapEdgesResponse } from './workflow/storage';
import { discoverServices, type DiscoverServicesResponse } from './workflow/discovery';
import { getEnvironments, type GetEnvironmentsResponse } from './workflow/discovery';
import { aggregateByService, type AggregateByServiceResponse } from './workflow/aggregation';

const serviceMapRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map',
  params: t.type({
    query: t.intersection([
      t.partial({
        serviceName: t.string,
        serviceGroup: t.string,
        kuery: kueryRt.props.kuery,
      }),
      environmentRt,
      rangeRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapResponse> => {
    const { config, context, params, logger } = resources;
    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    notifyFeatureUsage({
      licensingPlugin: licensingContext,
      featureName: 'serviceMaps',
    });

    const {
      query: { serviceName, serviceGroup: serviceGroupId, environment, start, end, kuery },
    } = params;

    const coreContext = await context.core;
    const {
      savedObjects: { client: savedObjectsClient },
      uiSettings: { client: uiSettingsClient },
      elasticsearch: { client: scopedClusterClient },
    } = coreContext;

    const [mlClient, apmEventClient, serviceGroup, maxNumberOfServices] = await Promise.all([
      getMlClient(resources),
      getApmEventClient(resources),
      serviceGroupId
        ? getServiceGroup({
            savedObjectsClient,
            serviceGroupId,
          })
        : Promise.resolve(null),
      uiSettingsClient.get<number>(apmServiceGroupMaxNumberOfServices),
    ]);

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
      kuery,
    });

    return getServiceMap({
      mlClient,
      config,
      apmEventClient,
      esClient: scopedClusterClient.asCurrentUser,
      serviceName,
      environment,
      searchAggregatedTransactions,
      logger: logger.get('serviceMap'),
      start,
      end,
      maxNumberOfServices,
      serviceGroupKuery: serviceGroup?.kuery,
      kuery,
      usePrecomputedServiceMap: config.serviceMapEnabled, // Enable when service map is enabled
    });
  },
});

const serviceMapServiceNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/service/{serviceName}',
  params: t.type({
    path: t.type({
      serviceName: t.string,
    }),
    query: t.intersection([environmentRt, rangeRt, offsetRt]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapServiceNodeInfoResponse> => {
    const { config, context, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const apmEventClient = await getApmEventClient(resources);

    const {
      path: { serviceName },
      query: { environment, start, end, offset },
    } = params;

    const searchAggregatedTransactions = await getSearchTransactionsEvents({
      apmEventClient,
      config,
      start,
      end,
    });

    return getServiceMapServiceNodeInfo({
      environment,
      apmEventClient,
      serviceName,
      searchAggregatedTransactions,
      start,
      end,
      offset,
    });
  },
});

const serviceMapDependencyNodeRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/service-map/dependency',
  params: t.type({
    query: t.intersection([
      t.type({
        dependencies: t.union([t.string, t.array(t.string)]),
      }),
      t.partial({
        sourceServiceName: t.string,
      }),
      environmentRt,
      rangeRt,
      offsetRt,
    ]),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ServiceMapServiceDependencyInfoResponse> => {
    const { config, context, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }
    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }
    const apmEventClient = await getApmEventClient(resources);

    const {
      query: { dependencies, sourceServiceName, environment, start, end, offset },
    } = params;

    return getServiceMapDependencyNodeInfo({
      apmEventClient,
      sourceServiceName,
      dependencies: Array.isArray(dependencies) ? dependencies : [dependencies],
      start,
      end,
      environment,
      offset,
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Workflow Routes for Pre-computed Service Map
// ─────────────────────────────────────────────────────────────────────────────

// Time windows for workflow operations
// Workflow runs every 5 minutes
const RESOLUTION_WINDOW_MS = 60 * 60 * 1000; // 1 hour - window to catch transactions that happened after spans
const LATE_ARRIVAL_BUFFER_MS = 1 * 60 * 1000; // 1 minute buffer for late-arriving spans
const INITIAL_WINDOW_MS = 5 * 60 * 1000; // 5 minutes - initial window for first run

const serviceMapWorkflowResolveRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/resolve-destinations',
  params: t.type({
    body: t.type({
      environment: t.union([t.string, t.undefined]),
    }),
  }),
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<ResolveServiceMapDestinationsResponse> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const apmEventClient = await getApmEventClient(resources);

    const now = Date.now();
    const start = now - RESOLUTION_WINDOW_MS;
    const end = now;

    return resolveServiceMapDestinations({
      apmEventClient,
      esClient,
      start,
      end,
      environment: params.body.environment,
      logger: logger.get('serviceMapWorkflow'),
    });
  },
});

const serviceMapWorkflowCleanupRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/cleanup',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<CleanupServiceMapEdgesResponse> => {
    const { config, context, logger } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;

    return cleanupServiceMapEdges({
      esClient,
      logger: logger.get('serviceMapWorkflow'),
    });
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// New Granular Workflow Steps
// ─────────────────────────────────────────────────────────────────────────────

const serviceMapWorkflowGetMetadataRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/get-metadata',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (
    resources
  ): Promise<{
    lastProcessedTimestamp: number | null;
    minMaxSpanTimestamp: number | null;
    effectiveStart: number;
    end: number;
  }> => {
    const { config, context, logger } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    const now = Date.now();
    const end = now;

    const [lastProcessedTimestamp, minMaxSpanTimestamp] = await Promise.all([
      getLastProcessedTimestamp({ esClient, logger: workflowLogger }),
      getMinMaxSpanTimestamp({ esClient, logger: workflowLogger }),
    ]);

    let start: number;
    if (lastProcessedTimestamp === null) {
      start = now - INITIAL_WINDOW_MS;
      workflowLogger.info(
        `First run detected, using ${INITIAL_WINDOW_MS / 1000 / 60}-minute initial window`
      );
    } else {
      start = lastProcessedTimestamp - LATE_ARRIVAL_BUFFER_MS;
      const windowMinutes = Math.round((end - start) / 1000 / 60);
      workflowLogger.debug(
        `Querying spans from ${new Date(start).toISOString()} to ${new Date(
          end
        ).toISOString()} (${windowMinutes} minutes)`
      );
    }

    const effectiveStart =
      minMaxSpanTimestamp != null && minMaxSpanTimestamp > start ? minMaxSpanTimestamp : start;

    if (effectiveStart > start) {
      workflowLogger.debug(
        `Using optimized start time ${new Date(effectiveStart).toISOString()} (was ${new Date(
          start
        ).toISOString()}) to avoid re-processing spans`
      );
    }

    return {
      lastProcessedTimestamp,
      minMaxSpanTimestamp,
      effectiveStart,
      end,
    };
  },
});

const serviceMapWorkflowAggregateExitSpansRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/aggregate-exit-spans',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      start: toNumberRt,
      end: toNumberRt,
      chunkSizeMinutes: t.union([toNumberRt, t.undefined]),
      maxConcurrency: t.union([toNumberRt, t.undefined]),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    indexed: number;
    updated: number;
    created: number;
    skipped: number;
    edgeCount: number;
    chunksProcessed: number;
    chunksSucceeded: number;
    chunksFailed: number;
  }> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    const start = params.body.start;
    const end = params.body.end;
    const chunkSizeMinutes = params.body.chunkSizeMinutes ?? 15;
    const maxConcurrency = params.body.maxConcurrency ?? 2;

    const allWindows = calculateTimeWindows(start, end, chunkSizeMinutes);

    // Filter out already-processed windows (except those within reprocessing buffer)
    const windows = await filterUnprocessedWindows({
      esClient,
      windows: allWindows,
      edgeType: 'exit_span',
      now: Date.now(),
      logger: workflowLogger,
    });

    workflowLogger.info(
      `Processing ${windows.length} of ${allWindows.length} windows for exit spans (${
        allWindows.length - windows.length
      } already completed)`
    );

    const chunkResults = await processChunksWithConcurrencyLimit({
      apmEventClient,
      esClient,
      windows,
      edgeType: 'exit_span',
      maxConcurrency,
      logger: workflowLogger,
    });

    return aggregateChunkResults(chunkResults);
  },
});

const serviceMapWorkflowAggregateSpanLinksRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/aggregate-span-links',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      start: toNumberRt,
      end: toNumberRt,
      chunkSizeMinutes: t.union([toNumberRt, t.undefined]),
      maxConcurrency: t.union([toNumberRt, t.undefined]),
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    indexed: number;
    updated: number;
    created: number;
    skipped: number;
    edgeCount: number;
    chunksProcessed: number;
    chunksSucceeded: number;
    chunksFailed: number;
  }> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    const start = params.body.start;
    const end = params.body.end;
    const chunkSizeMinutes = params.body.chunkSizeMinutes ?? 15;
    const maxConcurrency = params.body.maxConcurrency ?? 2;

    const allWindows = calculateTimeWindows(start, end, chunkSizeMinutes);

    // Filter out already-processed windows (except those within reprocessing buffer)
    const windows = await filterUnprocessedWindows({
      esClient,
      windows: allWindows,
      edgeType: 'span_link',
      now: Date.now(),
      logger: workflowLogger,
    });

    workflowLogger.info(
      `Processing ${windows.length} of ${allWindows.length} windows for span links (${
        allWindows.length - windows.length
      } already completed)`
    );

    const chunkResults = await processChunksWithConcurrencyLimit({
      apmEventClient,
      esClient,
      windows,
      edgeType: 'span_link',
      maxConcurrency,
      logger: workflowLogger,
    });

    return aggregateChunkResults(chunkResults);
  },
});

const serviceMapWorkflowUpdateMetadataRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/update-metadata',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      timestamp: toNumberRt,
    }),
  }),
  handler: async (resources): Promise<{ success: boolean }> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    await updateLastProcessedTimestamp({
      esClient,
      timestamp: params.body.timestamp,
      logger: workflowLogger,
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Service-Scoped Workflow Routes (Phase 1 Optimization)
// ─────────────────────────────────────────────────────────────────────────────

const serviceMapWorkflowDiscoverServicesRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/discover-services',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      start: toNumberRt,
      end: toNumberRt,
    }),
  }),
  handler: async (resources): Promise<DiscoverServicesResponse> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    return discoverServices({
      apmEventClient,
      esClient,
      start: params.body.start,
      end: params.body.end,
      logger: workflowLogger,
    });
  },
});

const serviceMapWorkflowGetEnvironmentsRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/get-environments',
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<GetEnvironmentsResponse> => {
    const { config, context, logger } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    return getEnvironments({
      esClient,
      logger: workflowLogger,
    });
  },
});

const serviceMapWorkflowAggregateExitSpansByServiceRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/aggregate-exit-spans-by-service',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      start: toNumberRt,
      end: toNumberRt,
      servicesPerBatch: t.union([toNumberRt, t.undefined]),
      maxConcurrency: t.union([toNumberRt, t.undefined]),
      environment: t.union([t.string, t.undefined]),
    }),
  }),
  handler: async (resources): Promise<AggregateByServiceResponse> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    return aggregateByService({
      apmEventClient,
      esClient,
      start: params.body.start,
      end: params.body.end,
      edgeType: 'exit_span',
      servicesPerBatch: params.body.servicesPerBatch ?? 5,
      maxConcurrency: params.body.maxConcurrency ?? 10,
      environment: params.body.environment,
      logger: workflowLogger,
    });
  },
});

const serviceMapWorkflowAggregateSpanLinksByServiceRoute = createApmServerRoute({
  endpoint: 'POST /internal/apm/service-map/workflow/aggregate-span-links-by-service',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.type({
    body: t.type({
      start: toNumberRt,
      end: toNumberRt,
      servicesPerBatch: t.union([toNumberRt, t.undefined]),
      maxConcurrency: t.union([toNumberRt, t.undefined]),
      environment: t.union([t.string, t.undefined]),
    }),
  }),
  handler: async (resources): Promise<AggregateByServiceResponse> => {
    const { config, context, logger, params } = resources;

    if (!config.serviceMapEnabled) {
      throw Boom.notFound();
    }

    const licensingContext = await context.licensing;
    if (!isActivePlatinumLicense(licensingContext.license)) {
      throw Boom.forbidden(invalidLicenseMessage);
    }

    const apmEventClient = await getApmEventClient(resources);
    const coreContext = await context.core;
    const esClient = coreContext.elasticsearch.client.asCurrentUser;
    const workflowLogger = logger.get('serviceMapWorkflow');

    return aggregateByService({
      apmEventClient,
      esClient,
      start: params.body.start,
      end: params.body.end,
      edgeType: 'span_link',
      servicesPerBatch: params.body.servicesPerBatch ?? 5,
      maxConcurrency: params.body.maxConcurrency ?? 10,
      environment: params.body.environment,
      logger: workflowLogger,
    });
  },
});

export const serviceMapRouteRepository = {
  ...serviceMapRoute,
  ...serviceMapServiceNodeRoute,
  ...serviceMapDependencyNodeRoute,
  ...serviceMapWorkflowResolveRoute,
  ...serviceMapWorkflowCleanupRoute,
  ...serviceMapWorkflowGetMetadataRoute,
  ...serviceMapWorkflowAggregateExitSpansRoute,
  ...serviceMapWorkflowAggregateSpanLinksRoute,
  ...serviceMapWorkflowUpdateMetadataRoute,
  ...serviceMapWorkflowDiscoverServicesRoute,
  ...serviceMapWorkflowGetEnvironmentsRoute,
  ...serviceMapWorkflowAggregateExitSpansByServiceRoute,
  ...serviceMapWorkflowAggregateSpanLinksByServiceRoute,
};
