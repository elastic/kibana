/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Asset } from '../../../../common/types_api';
import { GetServicesOptionsInjected } from '.';
import { getAssets } from '../../get_assets';
import { getAllRelatedAssets } from '../../get_all_related_assets';

export async function getServicesByAssets(
  options: GetServicesOptionsInjected
): Promise<{ services: Asset[] }> {
  if (options.parent) {
    return getServicesByParent(options);
  }

  const services = await getAssets({
    esClient: options.esClient,
    filters: {
      kind: 'service',
      from: options.from,
      to: options.to,
    },
  });

  return { services };
}

async function getServicesByParent(
  options: GetServicesOptionsInjected
): Promise<{ services: Asset[] }> {
  const { descendants } = await getAllRelatedAssets(options.esClient, {
    from: options.from,
    to: options.to,
    maxDistance: 5,
    kind: ['service'],
    size: 100,
    relation: 'descendants',
    ean: options.parent!,
  });

  return { services: descendants as Asset[] };
}
