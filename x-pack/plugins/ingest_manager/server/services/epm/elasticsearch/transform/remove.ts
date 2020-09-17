/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { CallESAsCurrentUser, ElasticsearchAssetType, EsAssetReference } from '../../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';

export const stopTransforms = async (transformIds: string[], callCluster: CallESAsCurrentUser) => {
  for (const transformId of transformIds) {
    await callCluster('transport.request', {
      method: 'POST',
      path: `/_transform/${transformId}/_stop`,
      query: 'force=true',
      ignore: [404],
    });
  }
};

export const deleteTransforms = async (
  callCluster: CallESAsCurrentUser,
  transformIds: string[]
) => {
  await Promise.all(
    transformIds.map(async (transformId) => {
      await stopTransforms([transformId], callCluster);
      await callCluster('transport.request', {
        method: 'DELETE',
        query: 'force=true',
        path: `/_transform/${transformId}`,
        ignore: [404],
      });
    })
  );
};

export const deleteTransformRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  installedEsIdToRemove: string[],
  currentInstalledEsTransformIds: string[]
) => {
  const seen = new Set<string>();
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.transform) return true;
    const add =
      (currentInstalledEsTransformIds.includes(id) || !installedEsIdToRemove.includes(id)) &&
      !seen.has(id);
    seen.add(id);
    return add;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
