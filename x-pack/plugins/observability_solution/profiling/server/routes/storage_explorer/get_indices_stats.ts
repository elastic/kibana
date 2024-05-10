/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

export const symbolsIndices = [
  'profiling-symbols-global',
  'profiling-symbols-private',
  'profiling-executables',
  'profiling-stackframes',
  'profiling-returnpads-private',
];

export const stacktracesIndices = [
  'profiling-events-*',
  'profiling-metrics',
  'profiling-stacktraces',
  'profiling-executables',
  'profiling-stackframes',
];

export const allIndices = [
  'profiling-events-*',
  'profiling-metrics',
  'profiling-stacktraces',
  'profiling-sq-executables',
  'profiling-sq-leafframes',
  'profiling-hosts',
  'profiling-symbols-global',
  'profiling-symbols-private',
  'profiling-executables',
  'profiling-stackframes',
  'profiling-returnpads-private',
];

export function getIndicesStats({
  client,
  indices,
}: {
  client: ElasticsearchClient;
  indices: string[];
}) {
  return client.indices.stats({ index: indices.join(), expand_wildcards: 'all' });
}

export function getIndicesInfo({
  client,
  indices,
}: {
  client: ElasticsearchClient;
  indices: string[];
}) {
  return client.indices.get({
    index: indices.join(),
    filter_path: [
      '*.settings.index.number_of_shards',
      '*.settings.index.number_of_replicas',
      '*.data_stream',
    ],
    features: ['settings'],
    expand_wildcards: 'all',
  });
}

export async function getIndicesLifecycleStatus({
  client,
  indices,
}: {
  client: ElasticsearchClient;
  indices: string[];
}) {
  const ilmLifecycle = await client.ilm.explainLifecycle({
    index: indices.join(),
    filter_path: 'indices.*.phase',
  });
  return ilmLifecycle.indices;
}

export function getNodesStats({ client }: { client: ElasticsearchClient }) {
  return client.nodes.stats({ metric: 'fs', filter_path: 'nodes.*.fs.total.total_in_bytes' });
}
