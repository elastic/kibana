/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { CallESAsCurrentUser, ElasticsearchAssetType, EsAssetReference } from '../../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../../../common/constants';

export const deleteIlms = async (callCluster: CallESAsCurrentUser, ilmPolicyIds: string[]) => {
  await Promise.all(
    ilmPolicyIds.map(async (ilmPolicyId) => {
      await callCluster('transport.request', {
        method: 'DELETE',
        path: `_ilm/policy/${ilmPolicyId}`,
        ignore: [404, 400],
      });
    })
  );
};

export const deleteIlmRefs = async (
  savedObjectsClient: SavedObjectsClientContract,
  installedEsAssets: EsAssetReference[],
  pkgName: string,
  installedEsIdToRemove: string[],
  currentInstalledEsIlmIds: string[]
) => {
  const seen = new Set<string>();
  const filteredAssets = installedEsAssets.filter(({ type, id }) => {
    if (type !== ElasticsearchAssetType.dataStreamIlmPolicy) return true;
    const add =
      (currentInstalledEsIlmIds.includes(id) || !installedEsIdToRemove.includes(id)) &&
      !seen.has(id);
    seen.add(id);
    return add;
  });
  return savedObjectsClient.update(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    installed_es: filteredAssets,
  });
};
