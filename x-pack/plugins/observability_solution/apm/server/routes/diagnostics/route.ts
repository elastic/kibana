/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldCapsResponse,
  IndicesDataStream,
  IndicesGetIndexTemplateIndexTemplateItem,
  IndicesGetResponse,
  IngestGetPipelineResponse,
  SecurityHasPrivilegesPrivileges,
} from '@elastic/elasticsearch/lib/api/types';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import * as t from 'io-ts';
import { isoToEpochRt } from '@kbn/io-ts-utils';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { ApmEvent } from './bundle/get_apm_events';
import { getDiagnosticsBundle } from './get_diagnostics_bundle';
import { getFleetPackageInfo } from './get_fleet_package_info';

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
  params: { start: number; end: number; kuery?: string };
}>;

const getDiagnosticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics',
  options: { tags: ['access:apm'] },
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
};
