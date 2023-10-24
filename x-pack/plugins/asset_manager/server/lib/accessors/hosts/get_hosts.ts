/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Asset } from '../../../../common/types_api';
import { collectHosts } from '../../collectors/hosts';
import { GetHostsOptionsPublic } from '../../../../common/types_client';
import {
  AssetClientDependencies,
  AssetClientOptionsWithInjectedValues,
} from '../../asset_client_types';

export type GetHostsOptions = GetHostsOptionsPublic & AssetClientDependencies;
export type GetHostsOptionsInjected = AssetClientOptionsWithInjectedValues<GetHostsOptions>;

export async function getHosts(options: GetHostsOptionsInjected): Promise<{ hosts: Asset[] }> {
  const metricsIndices = await options.metricsClient.getMetricIndices({
    savedObjectsClient: options.savedObjectsClient,
  });

  const filters: QueryDslQueryContainer[] = [];

  if (options.filters?.ean) {
    const fn = options.filters.ean.includes('*') ? 'wildcard' : 'term';
    filters.push({
      [fn]: {
        'host.hostname': options.filters.ean,
      },
    });
  }

  if (options.filters?.['cloud.provider']) {
    filters.push({
      term: {
        'cloud.provider': options.filters['cloud.provider'],
      },
    });
  }

  if (options.filters?.['cloud.region']) {
    filters.push({
      term: {
        'cloud.region': options.filters['cloud.region'],
      },
    });
  }

  const { assets } = await collectHosts({
    client: options.elasticsearchClient,
    from: options.from,
    to: options.to || 'now',
    filters,
    sourceIndices: {
      metrics: metricsIndices,
      logs: options.sourceIndices.logs,
    },
  });

  return {
    hosts: assets,
  };
}
