/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pRetry from 'p-retry';
import { uniqBy } from 'lodash';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MiscAssetReference, Installation } from '../../../types';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { auditLoggingService } from '../../audit_logging';

/**
 * Utility function for updating the installed_misc field of a package
 */
export const updateMiscAssetReferences = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  currentAssets: MiscAssetReference[],
  {
    assetsToAdd = [],
    assetsToRemove = [],
    refresh = false,
  }: {
    assetsToAdd?: MiscAssetReference[];
    assetsToRemove?: MiscAssetReference[];
    /**
     * Whether or not the update should force a refresh on the SO index.
     * Defaults to `false` for faster updates, should only be `wait_for` if the update needs to be queried back from ES
     * immediately.
     */
    refresh?: 'wait_for' | false;
  }
): Promise<MiscAssetReference[]> => {
  const withAssetsRemoved = currentAssets.filter(({ type, id }) => {
    if (
      assetsToRemove.some(
        ({ type: removeType, id: removeId }) => removeType === type && removeId === id
      )
    ) {
      return false;
    }
    return true;
  });

  const deduplicatedAssets = uniqBy(
    [...withAssetsRemoved, ...assetsToAdd],
    ({ type, id }) => `${type}-${id}`
  );

  auditLoggingService.writeCustomSoAuditLog({
    action: 'update',
    id: pkgName,
    savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
  });

  const {
    attributes: { installed_misc: updatedAssets },
  } =
    // Because Kibana assets are installed in parallel with ES assets with refresh: false, we almost always run into an
    // issue that causes a conflict error due to this issue: https://github.com/elastic/kibana/issues/126240. This is safe
    // to retry constantly until it succeeds to optimize this critical user journey path as much as possible.
    await pRetry(
      () =>
        savedObjectsClient.update<Installation>(
          PACKAGES_SAVED_OBJECT_TYPE,
          pkgName,
          {
            installed_misc: deduplicatedAssets,
          },
          {
            refresh,
          }
        ),
      // Use a lower number of retries for ES assets since they're installed in serial and can only conflict with
      // the single Kibana update call.
      { retries: 5 }
    );

  return updatedAssets ?? [];
};
