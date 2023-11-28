/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { Asset } from '../../../../common/types_api';
import { collectServices } from '../../collectors/services';
import { parseEan } from '../../parse_ean';
import { GetServicesOptionsPublic } from '../../../../common/types_client';
import {
  AssetClientDependencies,
  AssetClientOptionsWithInjectedValues,
} from '../../asset_client_types';
import { validateStringDateRange } from '../../validators/validate_date_range';

export type GetServicesOptions = GetServicesOptionsPublic & AssetClientDependencies;
export type GetServicesOptionsInjected = AssetClientOptionsWithInjectedValues<GetServicesOptions>;

export async function getServices(
  options: GetServicesOptionsInjected
): Promise<{ services: Asset[] }> {
  validateStringDateRange(options.from, options.to);

  const filters: QueryDslQueryContainer[] = [];

  if (options.filters?.ean) {
    const ean = Array.isArray(options.filters.ean) ? options.filters.ean[0] : options.filters.ean;
    const { kind, id } = parseEan(ean);

    if (kind !== 'service') {
      return {
        services: [],
      };
    }

    filters.push({
      term: {
        'service.name': id,
      },
    });
  }

  if (options.filters?.parentEan) {
    const { kind, id } = parseEan(options.filters?.parentEan);

    if (kind === 'host') {
      filters.push({
        bool: {
          should: [{ term: { 'host.name': id } }, { term: { 'host.hostname': id } }],
          minimum_should_match: 1,
        },
      });
    }

    if (kind === 'container') {
      filters.push({
        bool: {
          should: [{ term: { 'container.id': id } }],
          minimum_should_match: 1,
        },
      });
    }
  }

  if (options.filters?.id) {
    const fn = options.filters.id.includes('*') ? 'wildcard' : 'term';
    filters.push({
      [fn]: {
        'service.name': options.filters.id,
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

  const apmIndices = await options.getApmIndices(options.savedObjectsClient);
  const { assets } = await collectServices({
    client: options.elasticsearchClient,
    from: options.from,
    to: options.to || 'now',
    sourceIndices: {
      apm: apmIndices,
    },
    filters,
  });

  return { services: assets };
}
