/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ASSETS_SAVED_OBJECT_TYPE } from '../../../../../constants';
import type { PackageAssetReference } from '../../../../../types';

import { saveArchiveEntriesFromAssetsMap } from '../../../archive/storage';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepSaveArchiveEntries(context: InstallContext) {
  const { packageInstallContext, savedObjectsClient, installSource } = context;

  const { packageInfo } = packageInstallContext;

  const packageAssetResults = await withPackageSpan('Update archive entries', () =>
    saveArchiveEntriesFromAssetsMap({
      savedObjectsClient,
      assetsMap: packageInstallContext?.assetsMap,
      paths: packageInstallContext?.paths,
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
