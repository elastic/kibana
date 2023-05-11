/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  FieldCapsFieldCapability,
  IndicesDataStream,
} from '@elastic/elasticsearch/lib/api/types';
import { getApmEventClient } from '../../lib/helpers/get_apm_event_client';
import { createApmServerRoute } from '../apm_routes/create_apm_server_route';
import { SERVICE_NAME } from '../../../common/es_fields/apm';
import {
  getMatchingIndexTemplates,
  getUniqueApmIndices,
} from './index_templates/get_matching_index_templates';
import { getExpectedIndexTemplateStates } from './index_templates/get_expected_index_templates_states';
import { getNonDataStreamIndices } from './datastreams/get_non_data_stream_indices';

const fieldMappingsRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/invalid_field_mappings',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{ invalidFieldMappings: FieldCapsFieldCapability[] }> => {
    const apmEventClient = await getApmEventClient(resources);

    const res = await apmEventClient.fieldCaps('diagnostics_field_caps', {
      apm: { events: [ProcessorEvent.metric, ProcessorEvent.transaction] },
      fields: [SERVICE_NAME],
      filter_path: ['fields'],
    });

    const invalidFieldMappings = Object.values(res.fields[SERVICE_NAME]).filter(
      ({ type }): boolean => type !== 'keyword'
    );

    // const invalidFieldMappings = getInvalidFieldMappings(res);
    return { invalidFieldMappings };
  },
});

const indexTemplateRoute = createApmServerRoute({
  endpoint: 'GET /internal/apm/diagnostics/index_templates',
  options: { tags: ['access:apm'] },
  handler: async (
    resources
  ): Promise<{
    expectedIndexTemplateStates: Record<
      string,
      { exists: boolean; name?: string | undefined }
    >;
    matchingIndexTemplates: Array<{
      indexPattern: string;
      overlappingTemplates?: Array<{
        priority: number | undefined;
        templateIndexPatterns: string[];
        name: string;
      }>;
    }>;
  }> => {
    const apmEventClient = await getApmEventClient(resources);
    const expectedIndexTemplateStates = await getExpectedIndexTemplateStates(
      apmEventClient
    );
    const matchingIndexTemplates = await getMatchingIndexTemplates(
      apmEventClient
    );

    return { matchingIndexTemplates, expectedIndexTemplateStates };
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
    const apmIndices = getUniqueApmIndices(apmEventClient.indices).join(',');

    // fetch APM data streams
    const datastreamRes = await apmEventClient.dataStreams(
      'diagnostics_data_streams',
      {
        name: apmIndices,
        filter_path: ['data_streams.name', 'data_streams.template'],
      }
    );

    // fetch APM data streams
    const indicesRes = await apmEventClient.getIndices('get_indices', {
      index: apmIndices,
      filter_path: ['*.data_stream', '*.settings.index.uuid'],
    });

    const nonDataStreamIndices = getNonDataStreamIndices(indicesRes);

    return { dataStreams: datastreamRes.data_streams, nonDataStreamIndices };
  },
});

export const diagnosticsRepository = {
  ...fieldMappingsRoute,
  ...indexTemplateRoute,
  ...dataStreamRoute,
};
