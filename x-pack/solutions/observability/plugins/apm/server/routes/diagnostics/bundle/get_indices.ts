/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { compactMap } from '../../../utils/compact_map';

export function getApmIndexPatterns(indices: string[]) {
  return Array.from(new Set(indices.flatMap((index): string[] => index.split(','))));
}

export async function getIndicesAndIngestPipelines({
  esClient,
  apmIndices,
}: {
  esClient: ElasticsearchClient;
  apmIndices: APMIndices;
}) {
  const indices = await esClient.indices.get({
    index: getApmIndexPatterns([
      apmIndices.error,
      apmIndices.metric,
      apmIndices.span,
      apmIndices.transaction,
    ]),
    filter_path: [
      '*.settings.index.default_pipeline',
      '*.data_stream',
      '*.settings.index.provided_name',
    ],
    ignore_unavailable: true,
  });

  const pipelineIds = Array.from(
    new Set(compactMap(Object.values(indices), (index) => index.settings?.index?.default_pipeline))
  );

  const ingestPipelines = await esClient.ingest.getPipeline({
    id: pipelineIds.join(','),
    filter_path: ['*.processors.grok.field', '*.processors.grok.patterns'],
  });

  return { indices, ingestPipelines };
}
