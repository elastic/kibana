/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { routeDefinitions, type DiagnosticsResponse } from '@kbn/apm-api-shared';
import type { ServiceMapDiagnosticResponse } from '@kbn/apm-types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getTraceSampleIds } from '../service_map/get_trace_sample_ids';
import { getDiagnosticsBundle } from './get_diagnostics_bundle';
import { getFleetPackageInfo } from './get_fleet_package_info';
import {
  getDestinationParentIds,
  getExitSpans,
  getSourceSpanIds,
} from './service_map/get_exit_spans_from_samples';
import { getTraceCorrelation } from './service_map/get_trace_correlation';

const getServiceMapDiagnosticsRoute = createApmServerRoute({
  security: { authz: { requiredPrivileges: ['apm'] } },
  endpoint: routeDefinitions.diagnostics.serviceMap.endpoint,
  params: routeDefinitions.diagnostics.serviceMap.params,
  handler: async (resources): Promise<ServiceMapDiagnosticResponse> => {
    const { start, end, destinationNode, traceId, sourceNode } = resources.params.body;
    const apmEventClient = await getApmEventClient(resources);

    const { traceIds } = await getTraceSampleIds({
      config: resources.config,
      apmEventClient,
      serviceName: sourceNode,
      environment: ENVIRONMENT_ALL.value,
      start,
      end,
    });

    const [sourceSpans, traceCorrelation] = await Promise.all([
      getSourceSpanIds({
        apmEventClient,
        start,
        end,
        sourceNode,
        traceIds,
      }),
      getTraceCorrelation({
        apmEventClient,
        start,
        end,
        traceId,
        sourceNode,
        destinationNode,
      }),
    ]);

    const [exitSpans, destinationParentIds] = await Promise.all([
      getExitSpans({
        apmEventClient,
        start,
        end,
        sourceNode,
        destinationNode,
        parentSpans: sourceSpans.destinationsBySpanId,
      }),
      getDestinationParentIds({
        apmEventClient,
        start,
        end,
        parentSpans: sourceSpans.destinationsBySpanId,
        destinationNode,
      }),
    ]);

    return {
      analysis: {
        exitSpans: {
          found: exitSpans.apmExitSpans.length > 0,
          totalConnections: exitSpans.totalConnections,
          apmExitSpans: exitSpans.apmExitSpans,
          hasMatchingDestinationResources: exitSpans.hasMatchingDestinationResources,
        },
        parentRelationships: {
          found: destinationParentIds.hasParent,
          documentCount: destinationParentIds.rawResponse?.hits?.hits?.length || 0,
          sourceSpanIds: [...sourceSpans.destinationsBySpanId.keys()],
        },
        ...(traceId && {
          traceCorrelation: {
            found: traceCorrelation?.foundInBothNodes,
            foundInSourceNode: traceCorrelation?.foundInSourceNode,
            foundInDestinationNode: traceCorrelation?.foundInDestinationNode,
            sourceNodeDocumentCount: traceCorrelation?.sourceNodeDocumentCount,
            destinationNodeDocumentCount: traceCorrelation?.destinationNodeDocumentCount,
          },
        }),
      },
      // Include raw Elasticsearch responses for debugging and advanced analysis
      elasticsearchResponses: {
        exitSpansQuery: exitSpans.rawResponse,
        sourceSpansQuery: sourceSpans.sourceSpanIdsRawResponse,
        destinationParentIdsQuery: destinationParentIds.rawResponse,
        ...(traceId && {
          traceCorrelationQuery: traceCorrelation?.rawResponse,
        }),
      },
    };
  },
});

const getDiagnosticsRoute = createApmServerRoute({
  endpoint: routeDefinitions.diagnostics.getDiagnostics.endpoint,
  params: routeDefinitions.diagnostics.getDiagnostics.params,
  security: { authz: { requiredPrivileges: ['apm'] } },
  handler: async (resources): Promise<DiagnosticsResponse> => {
    const { start, end, kuery } = resources.params.query;
    const coreContext = await resources.context.core;
    const apmIndices = await resources.getApmIndices();
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;

    const bundle = await getDiagnosticsBundle({
      esClient,
      apmIndices,
      start,
      end,
      kuery,
    });

    const fleetPackageInfo = await getFleetPackageInfo(resources);
    const kibanaVersion = resources.kibanaVersion;

    return { ...bundle, fleetPackageInfo, kibanaVersion };
  },
});

export const diagnosticsRepository = {
  ...getDiagnosticsRoute,
  ...getServiceMapDiagnosticsRoute,
};
