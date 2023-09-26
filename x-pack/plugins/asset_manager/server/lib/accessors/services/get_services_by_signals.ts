/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../../../common/types_api';
import { GetServicesOptionsInjected } from '.';
import { collectServices } from '../../collectors/services';

export async function getServicesBySignals(
  options: GetServicesOptionsInjected
): Promise<{ services: Asset[] }> {
  const filters = [];

  if (options.parent) {
    filters.push({
      bool: {
        should: [
          { term: { 'host.name': options.parent } },
          { term: { 'host.hostname': options.parent } },
        ],
        minimum_should_match: 1,
      },
    });
  }

  const apmIndices = await options.getApmIndices(options.soClient);
  const { assets } = await collectServices({
    client: options.esClient,
    from: options.from,
    to: options.to,
    apmIndices,
    filters,
  });

  return { services: assets };
}
