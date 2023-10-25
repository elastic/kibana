/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  
  const filters = [];

  if (options.parent) {
    const { kind, id } = parseEan(options.parent);

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
