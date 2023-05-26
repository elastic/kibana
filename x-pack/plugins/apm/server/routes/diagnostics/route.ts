/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import {
  getMatchingIndexTemplates,
  getUniqueApmIndices,
} from './index_templates/get_matching_index_templates';
import { getDefaultApmIndexTemplateStates } from './index_templates/get_default_apm_index_templates_states';
import { getIndicesWithStatuses } from './indices/get_indices';

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
    const apmEventClient = await getApmEventClient(resources);
    return await getIndicesWithStatuses({ apmEventClient });
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
    const apmEventClient = await getApmEventClient(resources);
    const defaultApmIndexTemplateStates =
      await getDefaultApmIndexTemplateStates(apmEventClient);
    const indexTemplatesByIndexPattern = await getMatchingIndexTemplates(
      apmEventClient,
      defaultApmIndexTemplateStates
    );

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
    const apmEventClient = await getApmEventClient(resources);
    const defaultApmIndexTemplateStates =
      await getDefaultApmIndexTemplateStates(apmEventClient);

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
    const apmEventClient = await getApmEventClient(resources);
    const apmIndices = getUniqueApmIndices(apmEventClient.indices);

    // fetch APM data streams
    const datastreamRes = await apmEventClient.getDataStream(
      'diagnostics_data_streams',
      {
        name: apmIndices,
        filter_path: ['data_streams.name', 'data_streams.template'],
      }
    );

    // fetch non-data stream indices
    const indicesRes = await apmEventClient.getIndices('get_indices', {
      index: apmIndices,
      filter_path: ['*.data_stream', '*.settings.index.uuid'],
    });

    const nonDataStreamIndices = Object.entries(indicesRes)
      .filter(
        ([indexName, { data_stream: dataStream }]): boolean => !dataStream
      )
      .map(([indexName]): string => indexName);

    return { dataStreams: datastreamRes.data_streams, nonDataStreamIndices };
  },
});

export const diagnosticsRepository = {
  ...indexPatternSettingsRoute,
  ...fieldMappingsRoute,
  ...indexTemplateRoute,
  ...dataStreamRoute,
};
