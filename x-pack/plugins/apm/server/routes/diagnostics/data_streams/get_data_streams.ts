/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { ApmIndicesConfig } from '../../settings/apm_indices/get_apm_indices';
import { getApmIndexPatterns } from '../index_templates/get_matching_index_templates';

export async function getDataStreams({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: ApmIndicesConfig;
}) {
  const apmIndexPatterns = getApmIndexPatterns(apmIndices);

  // fetch APM data streams
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: apmIndexPatterns,
    filter_path: ['data_streams.name', 'data_streams.template'],
  });

  // fetch non-data stream indices
  const nonDataStreamIndicesResponse = await esClient.indices.get({
    index: apmIndexPatterns,
    filter_path: ['*.data_stream', '*.settings.index.uuid'],
  });

  const nonDataStreamIndices = Object.entries(nonDataStreamIndicesResponse)
    .filter(([indexName, { data_stream: dataStream }]): boolean => !dataStream)
    .map(([indexName]): string => indexName);

  return { dataStreams, nonDataStreamIndices };
}
