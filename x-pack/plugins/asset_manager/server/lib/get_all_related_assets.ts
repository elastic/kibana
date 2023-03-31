/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { AssetType, Relation } from '../../common/types_api';
import { getAssets } from './get_assets';
import { getRelatedAssets } from './get_related_assets';

export async function getAllRelatedAssets(
  esClient: ElasticsearchClient,
  options: {
    ean: string;
    from: string;
    to?: string;
    relation: Relation;
    type?: AssetType[];
    maxDistance: number;
    size: number;
  }
) {
  const { ean, from, to, type, relation } = options;

  const primaryResults = await getAssets({
    esClient,
    size: 1,
    filters: { ean, type, from, to },
  });

  if (primaryResults.length === 0) {
    throw new Error(`Could not find asset with ean=${ean}`);
  }

  const primary = primaryResults[0];
  // Translate relation paths to be generic
  const parentEans = primary['asset.parents']
    ? Array.isArray(primary['asset.parents']) // Why isn't it always an array?
      ? primary['asset.parents']
      : [primary['asset.parents']]
    : [];

  // What if maxDistance is below 1?
  // Can be skipped if parents are empty
  const parentResults = await getAssets({
    esClient,
    size: 1,
    filters: { ean: parentEans, type, from, to },
  });

  const nonReferencedParents = await getRelatedAssets({
    esClient,
    filters: {
      ean: parentEans,
      from,
      to,
    },
    relation,
  });

  // Bail if maxDistance is 1, else go for the next hop
  // Start with size = maxAssets, for each jump, deduct previousHop from size
  // If size = 0, don't do anything.
  return {
    primary,
    ancestors: parentResults.map((parent) => ({ ...parent, distance: 1 })),
  };
}
