/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_INDICES, METRICS_INDICES, LOGS_INDICES } from '../../../constants';
import { Asset } from '../../../../common/types_api';
import { CollectorOptions, QUERY_MAX_SIZE } from '.';
import { withSpan } from './helpers';

export async function collectHosts({
  client,
  from,
  transaction,
}: CollectorOptions): Promise<Asset[]> {
  const dsl = {
    index: [APM_INDICES, LOGS_INDICES, METRICS_INDICES],
    size: QUERY_MAX_SIZE,
    collapse: { field: 'host.hostname' },
    sort: [{ _score: 'desc' }, { '@timestamp': 'desc' }],
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
              },
            },
          },
        ],
        must: [{ exists: { field: 'host.hostname' } }],
        should: [
          { exists: { field: 'kubernetes.node.name' } },
          { exists: { field: 'kubernetes.pod.uid' } },
          { exists: { field: 'container.id' } },
        ],
      },
    },
  };

  const esResponse = await client.search(dsl);

  const hosts = withSpan({ transaction, name: 'processing_response' }, () => {
    return esResponse.hits.hits.reduce<Asset[]>((acc: Asset[], hit: any) => {
      const { fields = {} } = hit;
      const hostName = fields['host.hostname'];
      const k8sNode = fields['kubernetes.node.name'];
      const k8sPod = fields['kubernetes.pod.uid'];

      const hostEan = `host:${k8sNode || hostName}`;

      const host: Asset = {
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'host',
        'asset.id': k8sNode || hostName,
        'asset.name': k8sNode || hostName,
        'asset.ean': hostEan,
      };

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

      acc.push(host);

      return acc;
    }, []);
  });

  return hosts;
}
