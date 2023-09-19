/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-data-access-plugin/server';
import { getApmIndexPatterns } from './get_indices';

export async function getDataStreams({
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

  // fetch APM data streams
  const { data_streams: dataStreams } = await esClient.indices.getDataStream({
    name: apmIndexPatterns,
    filter_path: ['data_streams.name', 'data_streams.template'],
    // @ts-expect-error
    ignore_unavailable: true,
  });

  return dataStreams ?? [];
}
