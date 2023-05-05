/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import { APM_INDICES, LOGS_INDICES, METRICS_INDICES } from '../../../constants';
import { Asset } from '../../../../common/types_api';

export async function collectPods({ esClient }: { esClient: Client }) {
  const dsl = {
    index: [APM_INDICES, LOGS_INDICES, METRICS_INDICES],
    size: 1000,
    collapse: {
      field: 'kubernetes.pod.uid',
    },
    sort: [{ '@timestamp': 'desc' }],
    _source: false,
    fields: [
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
                gte: 'now-1h',
              },
            },
          },
        ],
        must: [
          { exists: { field: 'kubernetes.pod.uid' } },
          { exists: { field: 'kubernetes.node.name' } },
        ],
      },
    },
  };

  const esResponse = await esClient.search(dsl);

  const pods = esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
    const { fields = {} } = hit;
    const podUid = fields['kubernetes.pod.uid'];
    const nodeName = fields['kubernetes.node.name'];
    const clusterName = fields['orchestrator.cluster.name'];

    const pod: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'pod',
      'asset.id': podUid,
      'asset.ean': `pod:${podUid}`,
      'asset.parents': [`host:${nodeName}`],
    };

    if (fields['cloud.provider']) {
      pod['cloud.provider'] = fields['cloud.provider'];
    }

    if (clusterName) {
      pod['orchestrator.cluster.name'] = clusterName;
    }

    acc.push(pod);

    return acc;
  }, []);

  return pods;
}
