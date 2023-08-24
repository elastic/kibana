/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';
import { Asset } from '../../../common/types_api';
import { ServicesCollectorOptions, QUERY_MAX_SIZE } from '.';

export async function collectServices({
  client,
  from,
  to,
  apmIndices,
  afterKey,
  filters = [],
}: ServicesCollectorOptions) {
  const { transaction, error, metric } = apmIndices;
  const musts: estypes.QueryDslQueryContainer[] = [
    ...filters,
    {
      exists: {
        field: 'service.name',
      },
    },
  ];

  const dsl: estypes.SearchRequest = {
    index: [transaction, error, metric],
    size: 0,
    _source: false,
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
    aggs: {
      services: {
        composite: {
          size: QUERY_MAX_SIZE,
          sources: [
            {
              serviceName: {
                terms: {
                  field: 'service.name',
                },
              },
            },
            {
              serviceEnvironment: {
                terms: {
                  field: 'service.environment',
                  missing_bucket: true,
                },
              },
            },
          ],
        },
        aggs: {
          container_and_hosts: {
            multi_terms: {
              terms: [
                {
                  field: 'host.hostname',
                },
                {
                  field: 'container.id',
                },
              ],
            },
          },
        },
      },
    },
  };

  if (afterKey) {
    dsl.aggs!.services!.composite!.after = afterKey;
  }

  const esResponse = await client.search(dsl);

  const { after_key: nextKey, buckets = [] } = (esResponse.aggregations?.services || {}) as any;
  const assets = buckets.reduce((acc: Asset[], bucket: any) => {
    const {
      key: { serviceName, serviceEnvironment },
      container_and_hosts: containerHosts,
    } = bucket;

    if (!serviceName) {
      return acc;
    }

    const service: Asset = {
      '@timestamp': new Date().toISOString(),
      'asset.kind': 'service',
      'asset.id': serviceName,
      'asset.ean': `service:${serviceName}`,
      'asset.references': [],
      'asset.parents': [],
    };

    if (serviceEnvironment) {
      service['service.environment'] = serviceEnvironment;
    }

    containerHosts.buckets?.forEach((containerBucket: any) => {
      const [hostname, containerId] = containerBucket.key;
      if (hostname) {
        (service['asset.references'] as string[]).push(`host:${hostname}`);
      }

      if (containerId) {
        (service['asset.parents'] as string[]).push(`container:${containerId}`);
      }
    });

    acc.push(service);

    return acc;
  }, []);

  return { assets, afterKey: buckets.length === QUERY_MAX_SIZE ? nextKey : undefined };
}
