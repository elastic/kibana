/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { getApmIndexPatterns } from './get_indices';
import { compactMap } from '../../../utils/compact_map';

export async function getNonDataStreamIndices({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  const apmIndexPatterns = getApmIndexPatterns([
    apmIndices.error,
    apmIndices.metric,
    apmIndices.span,
    apmIndices.transaction,
  ]);

  // TODO: indices already retrieved by `getIndicesAndIngestPipelines`
  const nonDataStreamIndicesResponse = await esClient.indices.get({
    index: apmIndexPatterns,
    filter_path: ['*.data_stream', '*.settings.index.uuid'],
    ignore_unavailable: true,
  });

  const nonDataStreamIndices = compactMap(
    Object.entries(nonDataStreamIndicesResponse),
    ([indexName, { data_stream: dataStream }]) => {
      if (!dataStream) {
        return indexName;
      }
    }
  );

  return nonDataStreamIndices;
}
