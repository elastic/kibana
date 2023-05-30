/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_INDICES, LOGS_INDICES, METRICS_INDICES } from '../../../constants';
import { Asset } from '../../../../common/types_api';
import { CollectorOptions, QUERY_MAX_SIZE } from '.';
import { withSpan } from './helpers';

export async function collectPods({ client, from, transaction }: CollectorOptions) {
  const dsl = {
    index: [APM_INDICES, LOGS_INDICES, METRICS_INDICES],
    size: QUERY_MAX_SIZE,
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
                gte: from,
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

  const esResponse = await client.search(dsl);

  const pods = withSpan({ transaction, name: 'processing_response' }, () => {
    return esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
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
  });

  return pods;
}
