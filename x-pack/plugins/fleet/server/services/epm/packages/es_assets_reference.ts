/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import pRetry from 'p-retry';
import { uniqBy } from 'lodash';

import type { EsDataStream } from '../../../../common/types';

import type { EsAssetReference, Installation } from '../../../types';

import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { auditLoggingService } from '../../audit_logging';

/**
 * Utility function for updating the installed_es field of a package
 */
export const updateEsAssetReferences = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  currentAssets: EsAssetReference[],
  {
    assetsToAdd = [],
    assetsToRemove = [],
    refresh = false,
  }: {
    assetsToAdd?: EsAssetReference[];
    assetsToRemove?: EsAssetReference[];
    /**
     * Whether or not the update should force a refresh on the SO index.
     * Defaults to `false` for faster updates, should only be `wait_for` if the update needs to be queried back from ES
     * immediately.
     */
    refresh?: 'wait_for' | false;
  }
): Promise<EsAssetReference[]> => {
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
    attributes: { installed_es: updatedAssets },
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
            installed_es: deduplicatedAssets,
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
/**
 * Utility function for adding assets the installed_es field of a package
 * uses optimistic concurrency control to prevent missed updates
 */
export const optimisticallyAddEsAssetReferences = async (
  savedObjectsClient: SavedObjectsClientContract,
  pkgName: string,
  assetsToAdd: EsAssetReference[],
  esIndexPatterns?: Record<string, string>,
  esDataStreams?: EsDataStream[]
): Promise<EsAssetReference[]> => {
  const addEsAssets = async () => {
    // TODO: Should this be replaced by a `get()` call from epm/get.ts?
    const so = await savedObjectsClient.get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName);
    auditLoggingService.writeCustomSoAuditLog({
      action: 'get',
      id: pkgName,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });

    const installedEs = so.attributes.installed_es ?? [];

    const deduplicatedAssets = uniqBy(
      [...installedEs, ...assetsToAdd],
      ({ type, id }) => `${type}-${id}`
    );

    const deduplicatedIndexPatterns = Object.assign(
      {},
      so.attributes.es_index_patterns ?? {},
      esIndexPatterns
    );

    const deduplicatedDataStreams = uniqBy(
      [...(so.attributes.data_streams ?? []), ...(esDataStreams ?? [])],
      (datastream) => datastream.name
    );

    auditLoggingService.writeCustomSoAuditLog({
      action: 'update',
      id: pkgName,
      savedObjectType: PACKAGES_SAVED_OBJECT_TYPE,
    });

    const {
      attributes: { installed_es: updatedAssets },
    } = await savedObjectsClient.update<Installation>(
      PACKAGES_SAVED_OBJECT_TYPE,
      pkgName,
      {
        installed_es: deduplicatedAssets,
        es_index_patterns: deduplicatedIndexPatterns,
        data_streams: deduplicatedDataStreams,
      },
      {
        version: so.version,
      }
    );

    return updatedAssets ?? [];
  };

  const onlyRetryConflictErrors = (err: Error) => {
    if (!SavedObjectsErrorHelpers.isConflictError(err)) {
      throw err;
    }
  };

  return pRetry(addEsAssets, { retries: 10, onFailedAttempt: onlyRetryConflictErrors });
};
