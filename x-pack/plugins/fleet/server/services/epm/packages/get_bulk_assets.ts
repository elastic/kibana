/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import type {
  AssetSOObject,
  ElasticsearchAssetType,
  KibanaSavedObjectType,
  SimpleSOAssetType,
} from '../../../../common';

import { allowedAssetTypesLookup } from '../../../../common/constants';

import type { SimpleSOAssetAttributes } from '../../../types';

export async function getBulkAssets(
  soClient: SavedObjectsClientContract,
  assetIds: AssetSOObject[]
) {
  const { resolved_objects: resolvedObjects } = await soClient.bulkResolve<SimpleSOAssetAttributes>(
    assetIds
  );
  const res: SimpleSOAssetType[] = resolvedObjects
    .map(({ saved_object: savedObject }) => savedObject)
    .filter(
      (savedObject) =>
        savedObject?.error?.statusCode !== 404 && allowedAssetTypesLookup.has(savedObject.type)
    )
    .map((obj) => {
      return {
        id: obj.id,
        type: obj.type as unknown as ElasticsearchAssetType | KibanaSavedObjectType,
        updatedAt: obj.updated_at,
        attributes: {
          title: obj.attributes?.title,
          description: obj.attributes?.description,
        },
      };
    });
  return res;
}
