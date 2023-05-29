/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  getMatchingIndexTemplates,
  getApmIndexPatterns,
} from './index_templates/get_matching_index_templates';
import { getDefaultApmIndexTemplateStates } from './index_templates/get_default_apm_index_templates_states';
import { getIndicesWithStatuses } from './indices/get_indices';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';

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

const fieldMappingsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/indices',

  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    validItems: IndiciesItem[];
    invalidItems: IndiciesItem[];
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const apmIndices = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config: resources.config,
    });

    return await getIndicesWithStatuses({ esClient, apmIndices });
  },
});

const indexPatternSettingsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/index_pattern_settings',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    indexTemplatesByIndexPattern: Array<{
      indexPattern: string;
      indexTemplates?: Array<{
        priority: number | undefined;
        templateIndexPatterns: string[];
        templateName: string;
        isNonStandard: boolean;
      }>;
    }>;
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const apmIndices = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config: resources.config,
    });

    const defaultApmIndexTemplateStates =
      await getDefaultApmIndexTemplateStates({ esClient });
    const indexTemplatesByIndexPattern = await getMatchingIndexTemplates({
      apmIndices,
      esClient,
      defaultApmIndexTemplateStates,
    });

    return { indexTemplatesByIndexPattern };
  },
});

const indexTemplateRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/index_templates',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    defaultApmIndexTemplateStates: Record<
      string,
      { exists: boolean; name?: string | undefined }
    >;
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const defaultApmIndexTemplateStates =
      await getDefaultApmIndexTemplateStates({ esClient });

    return { defaultApmIndexTemplateStates };
  },
});

const dataStreamRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/data_streams',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    dataStreams: IndicesDataStream[];
    nonDataStreamIndices: string[];
  }> => {
    const coreContext = await resources.context.core;
    const { asCurrentUser } = coreContext.elasticsearch.client;
    const apmIndexPatterns = getApmIndexPatterns(
      await getApmIndices({
        savedObjectsClient: coreContext.savedObjects.client,
        config: resources.config,
      })
    );

    // fetch APM data streams
    const { data_streams: dataStreams } =
      await asCurrentUser.indices.getDataStream({
        name: apmIndexPatterns,
        filter_path: ['data_streams.name', 'data_streams.template'],
      });

    // fetch non-data stream indices
    const nonDataStreamIndicesResponse = await asCurrentUser.indices.get({
      index: apmIndexPatterns,
      filter_path: ['*.data_stream', '*.settings.index.uuid'],
    });

    const nonDataStreamIndices = Object.entries(nonDataStreamIndicesResponse)
      .filter(
        ([indexName, { data_stream: dataStream }]): boolean => !dataStream
      )
      .map(([indexName]): string => indexName);

    return { dataStreams, nonDataStreamIndices };
  },
});

export const diagnosticsRepository = {
  ...indexPatternSettingsRoute,
  ...fieldMappingsRoute,
  ...indexTemplateRoute,
  ...dataStreamRoute,
};
