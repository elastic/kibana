/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { Asset } from '../../../common/types_api';
import { CollectorOptions, QUERY_MAX_SIZE } from '.';
import { extractFieldValue } from '../utils';

export async function collectPods({
  client,
  from,
  to,
  sourceIndices,
  filters = [],
  afterKey,
}: CollectorOptions) {
  if (!sourceIndices?.metrics || !sourceIndices?.logs) {
    throw new Error('missing required metrics/logs indices');
  }

  const musts = [
    ...filters,
    { exists: { field: 'kubernetes.pod.uid' } },
    { exists: { field: 'kubernetes.node.name' } },
  ];

  const { metrics, logs } = sourceIndices;
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs],
    size: QUERY_MAX_SIZE,
    collapse: {
      field: 'kubernetes.pod.uid',
    },
    sort: [{ 'kubernetes.pod.uid': 'asc' }],
    _source: false,
    fields: [
      '@timestamp',
      'kubernetes.*',
      'cloud.provider',
      'orchestrator.cluster.name',
      'host.name',
      'host.hostname',
    ],
    query: {
      bool: {
        filter: [
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
        ],
        must: musts,
      },
    },
  };

  if (afterKey) {
    dsl.search_after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const assets = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const podUid = extractFieldValue(fields['kubernetes.pod.uid']);
    const nodeName = extractFieldValue(fields['kubernetes.node.name']);
    const clusterName = extractFieldValue(fields['orchestrator.cluster.name']);

    const pod: Asset = {
      '@timestamp': extractFieldValue(fields['@timestamp']),
      'asset.kind': 'pod',
      'asset.id': podUid,
      'asset.ean': `pod:${podUid}`,
      'asset.parents': [`host:${nodeName}`],
    };

    if (fields['cloud.provider']) {
      pod['cloud.provider'] = extractFieldValue(fields['cloud.provider']);
    }

    if (clusterName) {
      pod['orchestrator.cluster.name'] = clusterName;
    }

    acc.push(pod);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}
