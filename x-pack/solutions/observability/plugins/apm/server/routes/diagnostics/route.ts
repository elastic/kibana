/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  FieldCapsResponse,
  IndicesDataStream,
  IndicesGetIndexTemplateIndexTemplateItem,
  IndicesGetResponse,
  IngestGetPipelineResponse,
  SecurityHasPrivilegesPrivileges,
} from '@elastic/elasticsearch/lib/api/types';

import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import type { ApmEvent } from './bundle/get_apm_events';
import { getDiagnosticsBundle } from './get_diagnostics_bundle';
import { getFleetPackageInfo } from './get_fleet_package_info';
import {
  getDestinationParentIds,
  getSourceSpanIds,
  getExitSpans,
} from './service_map/get_exit_spans_from_samples';
import { getTraceCorrelation } from './service_map/get_trace_correlation';
import { rangeRt } from '../default_api_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import type { ServiceMapDiagnosticResponse } from '../../../common/service_map_diagnostic_types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';
import { getTraceSampleIds } from '../service_map/get_trace_sample_ids';
export interface IndiciesItem {
  index: string;
  fieldMappings: {
    isValid: boolean;
    invalidType?: string;
  };
  ingestPipeline: {
    isValid?: boolean;
    id?: string;
  };
  dataStream?: string;
  isValid: boolean;
}

export type DiagnosticsBundle = Promise<{
  esResponses: {
    existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
    fieldCaps: FieldCapsResponse;
    indices: IndicesGetResponse;
    ingestPipelines: IngestGetPipelineResponse;
  };
  diagnosticsPrivileges: {
    index: Record<string, SecurityHasPrivilegesPrivileges>;
    cluster: Record<string, boolean>;
    hasAllClusterPrivileges: boolean;
    hasAllIndexPrivileges: boolean;
    hasAllPrivileges: boolean;
  };
  apmIndices: APMIndices;
  apmIndexTemplates: Array<{
    name: string;
    isNonStandard: boolean;
    exists: boolean;
  }>;
  fleetPackageInfo: {
    isInstalled: boolean;
    version?: string;
  };
  kibanaVersion: string;
  elasticsearchVersion: string;
  apmEvents: ApmEvent[];
  invalidIndices: IndiciesItem[];
  validIndices: IndiciesItem[];
  dataStreams: IndicesDataStream[];
  nonDataStreamIndices: string[];
  indexTemplatesByIndexPattern: Array<{
    indexPattern: string;
    indexTemplates: Array<{
      priority: number | undefined;
      isNonStandard: boolean;
      templateIndexPatterns: string[];
      templateName: string;
    }>;
  }>;
  params: { start: number; end: number };
}>;

const getServiceMapDiagnosticsRoute = createApmServerRoute({
  security: { authz: { requiredPrivileges: ['apm'] } },
  endpoint: 'POST /internal/apm/diagnostics/service-map',
  params: t.type({
    body: t.intersection([
      rangeRt,
      t.type({
        sourceNode: t.string,
        destinationNode: t.string,
      }),
      t.partial({
        traceId: t.string,
      }),
    ]),
  }),
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
  endpoint: 'GET /internal/apm/diagnostics',
  security: { authz: { requiredPrivileges: ['apm'] } },
  params: t.partial({
    query: t.partial({
      kuery: t.string,
      start: isoToEpochRt,
      end: isoToEpochRt,
    }),
  }),
  handler: async (
    resources
  ): Promise<{
    esResponses: {
      existingIndexTemplates: IndicesGetIndexTemplateIndexTemplateItem[];
      fieldCaps?: FieldCapsResponse;
      indices?: IndicesGetResponse;
      ingestPipelines?: IngestGetPipelineResponse;
    };
    diagnosticsPrivileges: {
      index: Record<string, SecurityHasPrivilegesPrivileges>;
      cluster: Record<string, boolean>;
      hasAllClusterPrivileges: boolean;
      hasAllIndexPrivileges: boolean;
      hasAllPrivileges: boolean;
    };
    apmIndices: APMIndices;
    apmIndexTemplates: Array<{
      name: string;
      isNonStandard: boolean;
      exists: boolean;
    }>;
    fleetPackageInfo: {
      isInstalled: boolean;
      version?: string;
    };
    kibanaVersion: string;
    elasticsearchVersion: string;
    apmEvents: ApmEvent[];
    invalidIndices?: IndiciesItem[];
    validIndices?: IndiciesItem[];
    dataStreams: IndicesDataStream[];
    nonDataStreamIndices: string[];
    indexTemplatesByIndexPattern: Array<{
      indexPattern: string;
      indexTemplates: Array<{
        priority: number | undefined;
        isNonStandard: boolean;
        templateIndexPatterns: string[];
        templateName: string;
      }>;
    }>;
    params: { start: number; end: number; kuery?: string };
  }> => {
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
