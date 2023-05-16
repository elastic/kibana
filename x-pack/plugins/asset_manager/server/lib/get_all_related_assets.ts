/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { flatten, without } from 'lodash';
import { Asset, AssetKind, Relation, RelationField } from '../../common/types_api';
import { getAssets } from './get_assets';
import { getRelatedAssets } from './get_related_assets';
import { AssetNotFoundError } from './errors';
import { toArray } from './utils';

interface GetAllRelatedAssetsOptions {
  ean: string;
  from: string;
  to?: string;
  relation: Relation;
  kind?: AssetKind[];
  maxDistance: number;
  size: number;
}

export async function getAllRelatedAssets(
  esClient: ElasticsearchClient,
  options: GetAllRelatedAssetsOptions
) {
  // How to put size into this?
  const { ean, from, to, relation, maxDistance, kind = [] } = options;

  const primary = await findPrimary(esClient, { ean, from, to });

  let assetsToFetch = [primary];
  let currentDistance = 1;
  const relatedAssets = [];
  while (currentDistance <= maxDistance) {
    const queryOptions: FindRelatedAssetsOptions = {
      relation,
      from,
      to,
      visitedEans: [primary['asset.ean'], ...relatedAssets.map((asset) => asset['asset.ean'])],
    };
    // if we enforce the kind filter before the last query we'll miss nodes with
    // possible edges to the requested kinds
    if (currentDistance === maxDistance && kind.length) {
      queryOptions.kind = kind;
    }

    const results = flatten(
      await Promise.all(
        assetsToFetch.map((asset) => findRelatedAssets(esClient, asset, queryOptions))
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
    primary,
    [relation]: kind.length
      ? relatedAssets.filter((asset) => asset['asset.kind'] && kind.includes(asset['asset.kind']))
      : relatedAssets,
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
    throw new AssetNotFoundError(ean);
  }

  if (primaryResults.length > 1) {
    throw new Error(`Illegal state: Found more than one asset with the same ean (ean=${ean}).`);
  }

  return primaryResults[0];
}

type FindRelatedAssetsOptions = Pick<
  GetAllRelatedAssetsOptions,
  'relation' | 'kind' | 'from' | 'to'
> & { visitedEans: string[] };

async function findRelatedAssets(
  esClient: ElasticsearchClient,
  primary: Asset,
  { relation, from, to, kind, visitedEans }: FindRelatedAssetsOptions
): Promise<Asset[]> {
  const relationField = relationToDirectField(relation);
  const directlyRelatedEans = toArray(primary[relationField]);

  let directlyRelatedAssets: Asset[] = [];
  if (directlyRelatedEans.length) {
    // get the directly related assets we haven't visited already
    directlyRelatedAssets = await getAssets({
      esClient,
      filters: { ean: without(directlyRelatedEans, ...visitedEans), from, to, kind },
    });
  }

  const indirectlyRelatedAssets = await getRelatedAssets({
    esClient,
    ean: primary['asset.ean'],
    excludeEans: visitedEans.concat(directlyRelatedEans),
    relation,
    from,
    to,
    kind,
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

function withDistance(
  distance: number
): (value: Asset, index: number, array: Asset[]) => Asset & { distance: number } {
  return (asset: Asset) => ({ ...asset, distance });
}
