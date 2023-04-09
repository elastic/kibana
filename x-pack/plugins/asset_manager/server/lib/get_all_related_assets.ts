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
  // How to put size into this?
  const { ean, from, to, relation, maxDistance, type = [] } = options;

  const primary = await findPrimary(esClient, { ean, from, to });

  let assetsToFetch = primary;
  let currentDistance = 1;
  const relatedAssets = [];
  while (currentDistance <= maxDistance) {
    const results = flatten(
      await Promise.all(
        assetsToFetch.map((asset) => findRelatedAssets(esClient, asset, { relation, from, to }))
      )
    );

    if (results.length === 0) {
      break;
    }

    relatedAssets.push(...results.map(withDistance(currentDistance)));

    assetsToFetch = results;
    currentDistance++;
  }

  return {
    primary: primary[0],
    [relation]: type.length
      ? relatedAssets.filter((asset) => type.includes(asset['asset.type']))
      : relatedAssets,
  };
}

async function findPrimary(
  esClient: ElasticsearchClient,
  { ean, from, to }: Pick<GetAllRelatedAssetsOptions, 'ean' | 'from' | 'to'>
): Promise<Asset[]> {
  const primaryResults = await getAssets({
    esClient,
    size: 1,
    filters: { ean, from, to },
  });

  if (primaryResults.length === 0) {
    // This should probably result in a 404
    throw new Error(`Could not find asset with ean=${ean}`);
  }

  if (primaryResults.length > 1) {
    throw new Error(`Illegal state: Found more than one asset with the same ean (ean=${ean}).`);
  }

  return primaryResults;
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
    excludeEans: directlyRelatedEans,
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
