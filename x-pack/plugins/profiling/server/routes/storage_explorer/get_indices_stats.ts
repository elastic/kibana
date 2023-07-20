/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';

const symbolsIndices = ['profiling-symbols-global', 'profiling-symbols-private'];
const indices = [
  'profiling-events-*',
  'profiling-stacktraces',
  'profiling-executables',
  'profiling-stackframes',
  'profiling-sq-executables',
  'profiling-sq-leafframes',
  'profiling-hosts',
  ...symbolsIndices,
];

function getIndicesStats({ client, index }: { client: ElasticsearchClient; index: string }) {
  return client.indices.stats({ index, expand_wildcards: 'all' });
}

export function getTotalIndicesStats({ client }: { client: ElasticsearchClient }) {
  return getIndicesStats({ client, index: indices.join() });
}

export function getTotalSymbolsStats({ client }: { client: ElasticsearchClient }) {
  return getIndicesStats({ client, index: symbolsIndices.join() });
}

export function getNodesStats({ client }: { client: ElasticsearchClient }) {
  return client.nodes.stats({ metric: 'fs', filter_path: 'nodes.*.fs.total.total_in_bytes' });
}
