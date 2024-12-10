/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSETS_SAVED_OBJECT_TYPE } from '../../../../../constants';
import type { PackageAssetReference } from '../../../../../types';

import { removeArchiveEntries, saveArchiveEntriesFromAssetsMap } from '../../../archive/storage';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';
import { INSTALL_STATES } from '../../../../../../common/types';
import { isKibanaAssetType } from '../../../kibana/assets/install';

export async function stepSaveArchiveEntries(context: InstallContext) {
  const { packageInstallContext, savedObjectsClient, installSource, useStreaming } = context;

  const { packageInfo, archiveIterator } = packageInstallContext;

  let assetsMap = packageInstallContext?.assetsMap;
  let paths = packageInstallContext?.paths;
  // For stream based installations, we don't want to save any assets but
  // manifest.yaml due to the large number of assets in the package.
  if (useStreaming) {
    assetsMap = new Map();
    await archiveIterator.traverseEntries(async (entry) => {
      // Skip only kibana assets type
      if (!isKibanaAssetType(entry.path)) {
        assetsMap.set(entry.path, entry.buffer);
      }
    });
    paths = Array.from(assetsMap.keys());
  }

  const packageAssetResults = await withPackageSpan('Update archive entries', () =>
    saveArchiveEntriesFromAssetsMap({
      savedObjectsClient,
      assetsMap,
      paths,
      packageInfo,
      installSource,
    })
  );
  const packageAssetRefs: PackageAssetReference[] = packageAssetResults.saved_objects.map(
    (result) => ({
      id: result.id,
      type: ASSETS_SAVED_OBJECT_TYPE,
    })
  );

  return { packageAssetRefs };
}

export async function cleanupArchiveEntriesStep(context: InstallContext) {
  const { logger, savedObjectsClient, installedPkg, retryFromLastState, force, initialState } =
    context;

  // In case of retry clean up previous installed assets
  if (
    !force &&
    retryFromLastState &&
    initialState === INSTALL_STATES.SAVE_ARCHIVE_ENTRIES &&
    installedPkg?.attributes?.package_assets &&
    installedPkg.attributes.package_assets.length > 0
  ) {
    const { package_assets: packageAssets } = installedPkg.attributes;

    logger.debug('Retry transition - clean up package archive assets');
    await withPackageSpan('Retry transition - clean up package archive assets', async () => {
      await removeArchiveEntries({ savedObjectsClient, refs: packageAssets });
    });
  }
}
