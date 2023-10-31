/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Asset } from '../../../../common/types_api';
import { GetContainersOptionsPublic } from '../../../../common/types_client';
import {
  AssetClientDependencies,
  AssetClientOptionsWithInjectedValues,
} from '../../asset_client_types';
import { parseEan } from '../../parse_ean';
import { collectContainers } from '../../collectors';
import { validateStringDateRange } from '../../validators/validate_date_range';

export type GetContainersOptions = GetContainersOptionsPublic & AssetClientDependencies;
export type GetContainersOptionsInjected =
  AssetClientOptionsWithInjectedValues<GetContainersOptions>;

export async function getContainers(
  options: GetContainersOptionsInjected
): Promise<{ containers: Asset[] }> {
  validateStringDateRange(options.from, options.to);

  const metricsIndices = await options.metricsClient.getMetricIndices({
    savedObjectsClient: options.savedObjectsClient,
  });

  const filters: QueryDslQueryContainer[] = [];

  if (options.filters?.ean) {
    const ean = Array.isArray(options.filters.ean) ? options.filters.ean[0] : options.filters.ean;
    const { kind, id } = parseEan(ean);

    // if EAN filter isn't targeting a container asset, we don't need to do this query
    if (kind !== 'container') {
      return {
        containers: [],
      };
    }

    filters.push({
      term: {
        'container.id': id,
      },
    });
  }

  if (options.filters?.id) {
    const fn = options.filters.id.includes('*') ? 'wildcard' : 'term';
    filters.push({
      [fn]: {
        'container.id': options.filters.id,
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

  const { assets } = await collectContainers({
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
    containers: assets,
  };
}
