/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { flatten } from 'lodash';
import { Asset, AssetType, Relation, RelationField } from '../../common/types_api';
import { getAssets } from './get_assets';
import { getRelatedAssets } from './get_related_assets';

interface GetAllRelatedAssetsOptions {
  ean: string;
  from: string;
  to?: string;
  relation: Relation;
  type?: AssetType[];
  maxDistance: number;
  size: number;
}

export async function getAllRelatedAssets(
  esClient: ElasticsearchClient,
  options: GetAllRelatedAssetsOptions
) {
  const { ean, from, to, type, relation } = options;

  const primary = await findPrimary(esClient, { ean, from, to });

  // Distance 1
  const relatedAssets = await findRelatedAssets(esClient, primary, { relation, from, to });

  // Distance 2
  // Do we run these in parallel or in sequence?
  // Sequence might make more sense if we want to bail before size?
  const moreRelatedAssets = flatten(
    await Promise.all(
      relatedAssets.map((asset) => findRelatedAssets(esClient, asset, { relation, from, to }))
    )
  );

  // Distance 3
  const evenMoreRelatedAssets = flatten(
    await Promise.all(
      moreRelatedAssets.map((asset) => findRelatedAssets(esClient, asset, { relation, from, to }))
    )
  );

  // Bail if maxDistance is 1, else go for the next hop
  // Start with size = maxAssets, for each jump, deduct previousHop from size
  // If size = 0, don't do anything.

  // Filter down related by type
  return {
    primary,
    related: [
      ...relatedAssets.map(withDistance(1)),
      ...moreRelatedAssets.map(withDistance(2)),
      ...evenMoreRelatedAssets.map(withDistance(3)),
    ],
  };
}

async function findPrimary(
  esClient: ElasticsearchClient,
  { ean, from, to }: Pick<GetAllRelatedAssetsOptions, 'ean' | 'from' | 'to'>
): Promise<Asset> {
  const primaryResults = await getAssets({
    esClient,
    size: 1,
    filters: { ean, from, to },
  });

  if (primaryResults.length === 0) {
    throw new Error(`Could not find asset with ean=${ean}`);
  }

  return primaryResults[0];
}

async function findRelatedAssets(
  esClient: ElasticsearchClient,
  primary: Asset,
  { relation, from, to }: Pick<GetAllRelatedAssetsOptions, 'relation' | 'type' | 'from' | 'to'>
): Promise<Asset[]> {
  const relationField = relationToDirectField(relation);
  // Why isn't it always an array?
  const directlyRelatedEans = toArray(primary[relationField]);

  let directlyRelatedAssets: Asset[] = [];
  if (directlyRelatedEans.length) {
    directlyRelatedAssets = await getAssets({
      esClient,
      size: 1,
      filters: { ean: directlyRelatedEans, from, to },
    });
  }

  const indirectlyRelatedAssets = await getRelatedAssets({
    esClient,
    ean: primary['asset.ean'],
    relation,
    from,
    to,
  });

  return [...directlyRelatedAssets, ...indirectlyRelatedAssets];
}

function relationToDirectField(relation: Relation): RelationField {
  if (relation === 'ancestors') {
    return 'asset.parents';
  } else if (relation === 'descendants') {
    return 'asset.children';
  } else {
    return 'asset.references';
  }
}

function toArray(maybeArray: string | string[] | undefined): string[] {
  if (!maybeArray) {
    return [];
  }

  if (Array.isArray(maybeArray)) {
    return maybeArray;
  }

  return [maybeArray];
}

function withDistance(
  distance: number
): (value: Asset, index: number, array: Asset[]) => Asset & { distance: number } {
  return (asset: Asset) => ({ ...asset, distance });
}
