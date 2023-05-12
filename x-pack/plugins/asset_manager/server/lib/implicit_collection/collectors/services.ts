/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { APM_INDICES } from '../../../constants';
import { Asset } from '../../../../common/types_api';
import { CollectorOptions, QUERY_MAX_SIZE } from '.';
import { withSpan } from './helpers';

const MISSING_KEY = '__unknown__';

export async function collectServices({
  client,
  from,
  transaction,
}: CollectorOptions): Promise<Asset[]> {
  const dsl = {
    index: APM_INDICES,
    size: 0,
    sort: [
      {
        '@timestamp': 'desc',
      },
    ],
    _source: false,
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
          {
            exists: {
              field: 'service.name',
            },
          },
        ],
      },
    },
    aggs: {
      service_environment: {
        multi_terms: {
          size: QUERY_MAX_SIZE,
          terms: [
            {
              field: 'service.name',
            },
            {
              field: 'service.environment',
              missing: MISSING_KEY,
            },
          ],
        },
        aggs: {
          container_host: {
            multi_terms: {
              size: QUERY_MAX_SIZE,
              terms: [
                { field: 'container.id', missing: MISSING_KEY },
                { field: 'host.hostname', missing: MISSING_KEY },
              ],
            },
          },
        },
      },
    },
  };

  const esResponse = await client.search(dsl);

  const services = withSpan({ transaction, name: 'processing_response' }, () => {
    const serviceEnvironment = esResponse.aggregations?.service_environment as { buckets: any[] };

    return (serviceEnvironment?.buckets ?? []).reduce<Asset[]>((acc: Asset[], hit: any) => {
      const [serviceName, environment] = hit.key;
      const containerHosts = hit.container_host.buckets;

      const service: Asset = {
        '@timestamp': new Date().toISOString(),
        'asset.kind': 'service',
        'asset.id': serviceName,
        'asset.ean': `service:${serviceName}`,
        'asset.references': [],
        'asset.parents': [],
      };

      if (environment !== MISSING_KEY) {
        service['service.environment'] = environment;
      }

      containerHosts.forEach((nestedHit: any) => {
        const [containerId, hostname] = nestedHit.key;
        if (containerId !== MISSING_KEY) {
          (service['asset.parents'] as string[]).push(`container:${containerId}`);
        }

        if (hostname !== MISSING_KEY) {
          (service['asset.references'] as string[]).push(`host:${hostname}`);
        }
      });

      acc.push(service);

      return acc;
    }, []);
  });

  return services;
}
