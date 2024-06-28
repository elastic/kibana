/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { installKibanaAssetsAndReferencesMultispace } from '../../../kibana/assets/install';

import { withPackageSpan } from '../../utils';

import type { InstallContext } from '../_state_machine_package_install';

export async function stepInstallKibanaAssets(context: InstallContext) {
  const { savedObjectsClient, logger, installedPkg, packageInstallContext, spaceId } = context;
  const { packageInfo } = packageInstallContext;
  const { name: pkgName, title: pkgTitle } = packageInfo;

  const kibanaAssetPromise = withPackageSpan('Install Kibana assets', () =>
    installKibanaAssetsAndReferencesMultispace({
      savedObjectsClient,
      pkgName,
      pkgTitle,
      packageInstallContext,
      installedPkg,
      logger,
      spaceId,
      assetTags: packageInfo?.asset_tags,
    })
  );
  // Necessary to avoid async promise rejection warning
  // See https://stackoverflow.com/questions/40920179/should-i-refrain-from-handling-promise-rejection-asynchronously
  kibanaAssetPromise.catch(() => {});

  return { kibanaAssetPromise };
}
