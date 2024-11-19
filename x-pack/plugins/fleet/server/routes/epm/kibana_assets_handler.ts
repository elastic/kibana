/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import { FleetNotFoundError } from '../../errors';
import { appContextService } from '../../services';
import {
  deleteKibanaAssetsAndReferencesForSpace,
  installKibanaAssetsAndReferences,
} from '../../services/epm/kibana/assets/install';
import {
  getInstallationObject,
  getInstalledPackageWithAssets,
} from '../../services/epm/packages/get';
import type {
  DeleteKibanaAssetsRequestSchema,
  FleetRequestHandler,
  InstallKibanaAssetsRequestSchema,
} from '../../types';
import { createArchiveIteratorFromMap } from '../../services/epm/archive/archive_iterator';

export const installPackageKibanaAssetsHandler: FleetRequestHandler<
  TypeOf<typeof InstallKibanaAssetsRequestSchema.params>,
  undefined,
  TypeOf<typeof InstallKibanaAssetsRequestSchema.body>
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const logger = appContextService.getLogger();
  const spaceId = fleetContext.spaceId;
  const { pkgName, pkgVersion } = request.params;

  const installedPkgWithAssets = await getInstalledPackageWithAssets({
    savedObjectsClient,
    pkgName,
    logger,
  });

  const installation = await getInstallationObject({
    pkgName,
    savedObjectsClient,
  });

  if (
    !installation ||
    !installedPkgWithAssets ||
    installedPkgWithAssets?.installation.version !== pkgVersion
  ) {
    throw new FleetNotFoundError('Requested version is not installed');
  }

  const { packageInfo } = installedPkgWithAssets;

  await installKibanaAssetsAndReferences({
    savedObjectsClient,
    logger,
    pkgName,
    pkgTitle: packageInfo.title,
    installAsAdditionalSpace: true,
    spaceId,
    assetTags: installedPkgWithAssets.packageInfo?.asset_tags,
    installedPkg: installation,
    packageInstallContext: {
      packageInfo,
      paths: installedPkgWithAssets.paths,
      assetsMap: installedPkgWithAssets.assetsMap,
      archiveIterator: createArchiveIteratorFromMap(installedPkgWithAssets.assetsMap),
    },
  });

  return response.ok({ body: { success: true } });
};

export const deletePackageKibanaAssetsHandler: FleetRequestHandler<
  TypeOf<typeof DeleteKibanaAssetsRequestSchema.params>,
  undefined
> = async (context, request, response) => {
  const fleetContext = await context.fleet;
  const savedObjectsClient = fleetContext.internalSoClient;
  const logger = appContextService.getLogger();
  const spaceId = fleetContext.spaceId;
  const { pkgName, pkgVersion } = request.params;

  const installation = await getInstallationObject({
    pkgName,
    savedObjectsClient,
  });

  if (!installation || installation.attributes.version !== pkgVersion) {
    throw new FleetNotFoundError('Version is not installed');
  }

  await deleteKibanaAssetsAndReferencesForSpace({
    savedObjectsClient,
    logger,
    pkgName,
    spaceId,
    installedPkg: installation,
  });

  return response.ok({ body: { success: true } });
};
