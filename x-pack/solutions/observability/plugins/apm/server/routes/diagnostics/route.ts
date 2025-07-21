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
  getExitSpansFromNode,
  getSourceSpanIds,
} from './service_map/get_exit_spans_from_node';
import { rangeRt } from '../default_api_types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';

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
  endpoint: 'GET /internal/apm/diagnostics/service-map/{nodeName}',
  security: { authz: { requiredPrivileges: ['apm'] } },

  params: t.type({
    path: t.type({
      nodeName: t.string,
    }),
    // query: t.type({ rangeRt, destinationNode: t.string, traceId: t.string }),
    query: rangeRt,
  }),
  handler: async (resources) => {
    const { start, end, destinationNode, traceId } = resources.params.query;
    const { nodeName } = resources.params.path;
    const apmEventClient = await getApmEventClient(resources);

    const exitSpans = await getExitSpansFromNode({
      apmEventClient,
      start,
      end,
      serviceName: nodeName,
    });

    const { sourceSpanIdsRawResponse, spanIds } = await getSourceSpanIds({
      apmEventClient,
      start,
      end,
      serviceName: nodeName,
    });

    console.log('getSpanId', spanIds);

    const destinationParentIds = await getDestinationParentIds({
      apmEventClient,
      start,
      end,
      ids: spanIds,
      destinationNode,
    });

    console.log('destinationParentIds', destinationParentIds);
    
    // Process the exit spans data to create a flatter structure
    const connections = exitSpans?.response?.aggregations?.destination_resources?.buckets?.map(
      (item: any) => {
        // Defensive mapping, handle missing fields
        const src = item?.sample_doc?.hits?.hits?.[0]?._source;
        return {
          'span.destination.service.resource': src?.span?.destination?.service?.resource ?? '',
          'span.subtype': src?.span?.subtype ?? '',
          'span.id': src?.span?.id ?? '',
          'span.type': src?.span?.type ?? '',
          'transaction.id': src?.transaction?.id ?? '',
          'service.node.name': src?.service?.node?.name ?? '',
          'trace.id': src?.trace?.id ?? '',
          docCount: item?.doc_count ?? 0,
        };
      }
    ) || [];

    return {
      connections,
      totalConnections: connections.length,
      hasConnections: connections.length > 0,
      rawResponse: exitSpans, // Keep raw response for debugging if needed
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
