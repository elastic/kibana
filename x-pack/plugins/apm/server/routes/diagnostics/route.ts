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
import { getApmIndexTemplates } from './index_templates/get_existing_index_templates';
import { getIndicesAndIngestPipelines } from './indices/get_indices';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { getIndexTemplatesByIndexPattern } from './index_pattern_settings/get_index_templates_by_index_pattern';
import { getDataStreams } from './data_streams/get_data_streams';
import { getNonDataStreamIndices } from './data_streams/get_non_data_stream_indices';
import { getFieldCaps } from './indices/get_field_caps';
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
    packageInfo: {
      isInstalled: boolean;
      version?: string;
    };
    dataStreams: IndicesDataStream[];
    nonDataStreamIndices: string[];
    indexTemplatesByIndexPattern: Array<{
      indexPattern: string;
      indexTemplates: Array<{
        priority: number | undefined;
        templateIndexPatterns: string[];
        templateName: string;
      }>;
    }>;
    existingIndexTemplates: IndicesGetIndexTemplateResponse;
    fieldCaps: FieldCapsResponse;
    indices: IndicesGetResponse;
    ingestPipelines: IngestGetPipelineResponse;
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const apmIndices = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config: resources.config,
    });

    const packageInfo = await getFleetPackageInfo(resources);

    const { indices, ingestPipelines } = await getIndicesAndIngestPipelines({
      esClient,
      apmIndices,
    });

    const indexTemplatesByIndexPattern = await getIndexTemplatesByIndexPattern({
      esClient,
      apmIndices,
    });

    const existingIndexTemplates = await getApmIndexTemplates({
      esClient,
    });

    const fieldCaps = await getFieldCaps({ esClient, apmIndices });

    const dataStreams = await getDataStreams({ esClient, apmIndices });
    const nonDataStreamIndices = await getNonDataStreamIndices({
      esClient,
      apmIndices,
    });

    return {
      packageInfo,
      fieldCaps,
      indices,
      ingestPipelines,
      indexTemplatesByIndexPattern,
      existingIndexTemplates,
      dataStreams,
      nonDataStreamIndices,
    };
  },
});

export const diagnosticsRepository = {
  ...getDiagnosticsRoute,
};
