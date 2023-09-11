/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { Asset } from '../../../common/types_api';
import { CollectorOptions, QUERY_MAX_SIZE } from '.';

export async function collectHosts(options: CollectorOptions) {
  const results = await Promise.all([
    collectK8sNodes(options),
    collectCloudHosts(options),
    collectHostsById(options),
    collectHostsByName(options),
  ]);

  return results[0];
}

export async function collectK8sNodes({
  client,
  from,
  to,
  sourceIndices,
  afterKey,
}: CollectorOptions) {
  const { metrics, logs, traces } = sourceIndices;
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs, traces],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'kubernetes.node.uid' },
    sort: [{ 'kubernetes.node.uid': 'asc' }],
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
        must: [{ exists: { field: 'kubernetes.node.uid' } }],
        should: [
          { exists: { field: 'kubernetes.node.name' } },
          { exists: { field: 'kubernetes.pod.uid' } },
          { exists: { field: 'container.id' } },
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
    const nodeUid = fields['kubernetes.node.uid'];
    const nodeName = fields['kubernetes.node.name'];
    const hostName = fields['host.hostname'];
    const hostId = fields['host.id'];
    const k8sPod = fields['kubernetes.pod.uid'];
    const containerId = fields['container.id'];

    const hostEan = `host:${nodeUid}`;

    const host: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'host',
      'asset.id': nodeUid,
      'asset.name': nodeUid,
      'asset.ean': hostEan,
      'kubernetes.node.uid': nodeUid,
      'kubernetes.node.name': nodeName,
    };

    if (hostId) {
      host['host.id'] = hostId;
    }

    if (hostName) {
      host['host.hostname'] = hostName;
    }

    if (fields['cloud.provider']) {
      host['cloud.provider'] = fields['cloud.provider'];
    }

    if (fields['cloud.instance.id']) {
      host['cloud.instance.id'] = fields['cloud.instance.id'];
    }

    if (fields['cloud.service.name']) {
      host['cloud.service.name'] = fields['cloud.service.name'];
    }

    if (fields['cloud.region']) {
      host['cloud.region'] = fields['cloud.region'];
    }

    if (fields['orchestrator.cluster.name']) {
      host['orchestrator.cluster.name'] = fields['orchestrator.cluster.name'];
    }

    if (k8sPod) {
      host['asset.children'] = [`pod:${k8sPod}`];
    }

    if (containerId) {
      host['asset.references'] = [`container:${containerId}`];
    }

    acc.push(host);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}

export async function collectCloudHosts({
  client,
  from,
  to,
  sourceIndices,
  afterKey,
}: CollectorOptions) {
  const { metrics, logs, traces } = sourceIndices;
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs, traces],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'cloud.instance.id' },
    sort: [{ 'cloud.instance.id': 'asc' }],
    _source: false,
    fields: [
      '@timestamp',
      'cloud.*',
      'container.*',
      'host.hostname',
      'host.id',
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
        must_not: [{ exists: { field: 'kubernetes.node.uid' } }],
        must: [{ exists: { field: 'cloud.instance.id' } }],
        should: [{ exists: { field: 'container.id' } }],
      },
    },
  };

  if (afterKey) {
    dsl.search_after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const assets = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const instanceId = fields['cloud.instance.id'];
    const hostName = fields['host.hostname'];
    const hostId = fields['host.id'];
    const k8sPod = fields['kubernetes.pod.uid'];
    const containerId = fields['container.id'];

    const hostEan = `host:${instanceId}`;

    const host: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'host',
      'asset.id': instanceId,
      'asset.name': instanceId,
      'asset.ean': hostEan,
      'asset.children': [],
    };

    if (hostId) {
      host['host.id'] = hostId;
    }

    if (hostName) {
      host['host.hostname'] = hostName;
    }

    if (fields['cloud.provider']) {
      host['cloud.provider'] = fields['cloud.provider'];
    }

    if (fields['cloud.instance.id']) {
      host['cloud.instance.id'] = fields['cloud.instance.id'];
    }

    if (fields['cloud.service.name']) {
      host['cloud.service.name'] = fields['cloud.service.name'];
    }

    if (fields['cloud.region']) {
      host['cloud.region'] = fields['cloud.region'];
    }

    if (fields['orchestrator.cluster.name']) {
      host['orchestrator.cluster.name'] = fields['orchestrator.cluster.name'];
    }

    if (k8sPod) {
      host['asset.children'] = [`pod:${k8sPod}`];
    }

    if (containerId) {
      host['asset.references'] = [`container:${containerId}`];
    }

    acc.push(host);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}

export async function collectHostsById({
  client,
  from,
  to,
  sourceIndices,
  afterKey,
}: CollectorOptions) {
  const { metrics, logs, traces } = sourceIndices;
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs, traces],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'host.id' },
    sort: [{ 'host.id': 'asc' }],
    _source: false,
    fields: [
      '@timestamp',
      'cloud.*',
      'container.*',
      'host.hostname',
      'host.id',
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
        must_not: [
          { exists: { field: 'kubernetes.node.uid' } },
          { exists: { field: 'cloud.instance.id' } },
        ],
        must: [{ exists: { field: 'host.id' } }],
        should: [{ exists: { field: 'container.id' } }],
      },
    },
  };

  if (afterKey) {
    dsl.search_after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const assets = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const hostName = fields['host.hostname'];
    const hostId = fields['host.id'];
    const k8sPod = fields['kubernetes.pod.uid'];
    const containerId = fields['container.id'];

    const hostEan = `host:${hostId}`;

    const host: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'host',
      'asset.id': hostId,
      'asset.name': hostId,
      'asset.ean': hostEan,
      'asset.children': [],
    };

    if (hostName) {
      host['host.hostname'] = hostName;
    }

    if (k8sPod) {
      host['asset.children'] = [`pod:${k8sPod}`];
    }

    if (containerId) {
      host['asset.references'] = [`container:${containerId}`];
    }

    if (fields['orchestrator.cluster.name']) {
      host['orchestrator.cluster.name'] = fields['orchestrator.cluster.name'];
    }

    acc.push(host);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}

export async function collectHostsByName({
  client,
  from,
  to,
  sourceIndices,
  afterKey,
}: CollectorOptions) {
  const { metrics, logs, traces } = sourceIndices;
  const dsl: estypes.SearchRequest = {
    index: [metrics, logs, traces],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'host.name' },
    sort: [{ 'host.name': 'asc' }],
    _source: false,
    fields: ['@timestamp', 'container.*', 'host.hostname', 'host.id', 'orchestrator.cluster.name'],
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
        must_not: [
          { exists: { field: 'kubernetes.node.uid' } },
          { exists: { field: 'cloud.instance.id' } },
          { exists: { field: 'host.id' } },
        ],
        must: [{ exists: { field: 'host.name' } }],
        should: [{ exists: { field: 'container.id' } }],
      },
    },
  };

  if (afterKey) {
    dsl.search_after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const assets = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const hostName = fields['host.hostname'];
    const k8sPod = fields['kubernetes.pod.uid'];
    const containerId = fields['container.id'];

    const hostEan = `host:${hostName}`;

    const host: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'host',
      'asset.id': hostName,
      'asset.name': hostName,
      'asset.ean': hostEan,
      'host.hostname': hostName,
      'asset.children': [],
    };

    if (fields['orchestrator.cluster.name']) {
      host['orchestrator.cluster.name'] = fields['orchestrator.cluster.name'];
    }

    if (k8sPod) {
      host['asset.children'] = [`pod:${k8sPod}`];
    }

    if (containerId) {
      host['asset.references'] = [`container:${containerId}`];
    }

    acc.push(host);

    return acc;
  }, []);

  const hitsLen = esResponse.hits.hits.length;
  const next = hitsLen === QUERY_MAX_SIZE ? esResponse.hits.hits[hitsLen - 1].sort : undefined;
  return { assets, afterKey: next };
}
