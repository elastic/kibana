/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { getDefaultApmIndexTemplateStates } from './index_templates/get_default_apm_index_templates_states';
import { getIndicesWithStatuses } from './indices/get_indices';
import { getApmIndices } from '../settings/apm_indices/get_apm_indices';
import { getIndexTemplatesByIndexPattern } from './index_templates/get_index_pattern_settings';
import { getDataStreams } from './data_streams/get_data_streams';

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

    const indexTemplatesByIndexPattern = await getIndexTemplatesByIndexPattern({
      esClient,
      apmIndices,
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
    const { asCurrentUser: esClient } = coreContext.elasticsearch.client;
    const apmIndices = await getApmIndices({
      savedObjectsClient: coreContext.savedObjects.client,
      config: resources.config,
    });

    return getDataStreams({ apmIndices, esClient });
  },
});

export const diagnosticsRepository = {
  ...indexPatternSettingsRoute,
  ...fieldMappingsRoute,
  ...indexTemplateRoute,
  ...dataStreamRoute,
};
