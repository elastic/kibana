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

export async function collectHosts({
  client,
  from,
  to,
  sourceIndices,
  afterKey,
  filters = [],
}: CollectorOptions) {
  if (!sourceIndices?.metrics || !sourceIndices?.logs) {
    throw new Error('missing required metrics/logs indices');
  }

  const { metrics, logs } = sourceIndices;

  const musts = [...filters, { exists: { field: 'host.hostname' } }];
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'host.hostname' },
    sort: [{ 'host.hostname': 'asc' }],
    _source: false,
    fields: [
      '@timestamp',
      'cloud.*',
      'container.*',
      'host.hostname',
      'kubernetes.*',
      'orchestrator.cluster.name',
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
        should: [
          { exists: { field: 'kubernetes.node.name' } },
          { exists: { field: 'kubernetes.pod.uid' } },
          { exists: { field: 'container.id' } },
          { exists: { field: 'cloud.provider' } },
        ],
      },
    },
  };

  if (afterKey) {
    dsl.search_after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const assets = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const hostName = extractFieldValue(fields['host.hostname']);
    const k8sNode = extractFieldValue(fields['kubernetes.node.name']);
    const k8sPod = extractFieldValue(fields['kubernetes.pod.uid']);

    const hostEan = `host:${k8sNode || hostName}`;

    const host: Asset = {
      '@timestamp': extractFieldValue(fields['@timestamp']),
      'asset.kind': 'host',
      'asset.id': k8sNode || hostName,
      'asset.name': k8sNode || hostName,
      'asset.ean': hostEan,
    };

    if (fields['cloud.provider']) {
      host['cloud.provider'] = extractFieldValue(fields['cloud.provider']);
    }

    if (fields['cloud.instance.id']) {
      host['cloud.instance.id'] = extractFieldValue(fields['cloud.instance.id']);
    }

    if (fields['cloud.service.name']) {
      host['cloud.service.name'] = extractFieldValue(fields['cloud.service.name']);
    }

    if (fields['cloud.region']) {
      host['cloud.region'] = extractFieldValue(fields['cloud.region']);
    }

    if (fields['orchestrator.cluster.name']) {
      host['orchestrator.cluster.name'] = extractFieldValue(fields['orchestrator.cluster.name']);
    }

    if (k8sPod) {
      host['asset.children'] = [`pod:${k8sPod}`];
    }

    acc.push(host);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}
