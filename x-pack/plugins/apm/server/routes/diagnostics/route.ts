/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FieldCapsResponse,
  IndicesDataStream,
  IndicesGetIndexTemplateResponse,
  IndicesGetResponse,
  IngestGetPipelineResponse,
} from '@elastic/elasticsearch/lib/api/types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
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

const getDiagnosticsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics',

  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    esResponses: {
      existingIndexTemplates: IndicesGetIndexTemplateResponse;
      fieldCaps: FieldCapsResponse;
      indices: IndicesGetResponse;
      ingestPipelines: IngestGetPipelineResponse;
    };
    apmIndexTemplates: Array<{
      prefix?: string;
      name?: string;
      isNonStandard: boolean;
      exists: boolean;
    }>;
    fleetPackageInfo: {
      isInstalled: boolean;
      version?: string;
    };
    kibanaVersion: string;
    elasticsearchVersion: string;
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
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const apmIndices = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config: resources.config,
    });

    const bundle = await getDiagnosticsBundle(esClient, apmIndices);
    const fleetPackageInfo = await getFleetPackageInfo(resources);
    const kibanaVersion = resources.kibanaVersion;

    return { ...bundle, fleetPackageInfo, kibanaVersion };
  },
});

export const diagnosticsRepository = {
  ...getDiagnosticsRoute,
};
