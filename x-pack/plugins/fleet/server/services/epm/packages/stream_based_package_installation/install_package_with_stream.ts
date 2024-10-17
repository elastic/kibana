/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';

import { FLEET_INSTALL_FORMAT_VERSION, PACKAGES_SAVED_OBJECT_TYPE } from '../../../../constants';
import type {
  InstallResult,
  InstallSource,
  Installation,
  KibanaAssetReference,
  KibanaAssetType,
} from '../../../../types';
import type { ArchiveEntry } from '../../archive';
import {
  generatePackageInfoFromArchiveBuffer,
  getPathParts,
  traverseArchiveEntries,
} from '../../archive';
import type { ArchiveAsset } from '../../kibana/assets/install';
import {
  KibanaSavedObjectTypeMapping,
  createSavedObjectKibanaAsset,
  isKibanaAssetType,
  toAssetReference,
} from '../../kibana/assets/install';
import * as Registry from '../../registry';
import { getBundledPackageByPkgKey } from '../bundled_packages';
import { getInstallationObject } from '../get';
import { createInstallation, saveKibanaAssetsRefs } from '../install';
import { deleteKibanaAssets } from '../remove';

interface InstallPackageWithStreamArgs {
  pkgName: string;
  pkgVersion: string;
  spaceId: string;
  savedObjectsClient: SavedObjectsClientContract;
}

const MAX_ASSETS_TO_INSTALL_IN_PARALLEL = 100;

export async function installPackageWithStream(
  args: InstallPackageWithStreamArgs
): Promise<InstallResult> {
  const { pkgName, pkgVersion, spaceId, savedObjectsClient } = args;

  const pkgkey = Registry.pkgToPkgKey({
    name: pkgName,
    version: pkgVersion,
  });
  const matchingBundledPackage = await getBundledPackageByPkgKey(pkgkey);

  let installSource: InstallSource;
  let contentType: string;
  let archiveBuffer: Buffer;
  if (matchingBundledPackage) {
    installSource = 'bundled';
    contentType = 'application/zip';
    archiveBuffer = await matchingBundledPackage.getBuffer();
  } else {
    installSource = 'registry';
    const archive = await Registry.fetchArchiveBuffer({
      pkgName,
      pkgVersion,
      shouldVerify: false,
    });
    contentType = Registry.ensureContentType(archive.archivePath);
    archiveBuffer = archive.archiveBuffer;
  }

  const { packageInfo } = await generatePackageInfoFromArchiveBuffer(archiveBuffer, contentType);

  // Get the currently installed package
  const installedPkg = await getInstallationObject({ savedObjectsClient, pkgName });
  const existingAssetRefs = installedPkg?.attributes.installed_kibana ?? [];

  // Initiate the package installation
  await createInstallation({
    savedObjectsClient,
    packageInfo,
    installSource,
    spaceId,
  });

  // Install the new Kibana assets
  const assetRefs: KibanaAssetReference[] = await installKibanaAssets(
    savedObjectsClient,
    archiveBuffer,
    contentType
  );

  // Remove any existing assets that are not in the new package
  const newAssetRefKeys = new Set(assetRefs.map((asset) => `${asset.id}-${asset.type}`));
  const assetsToRemove = existingAssetRefs.filter(
    (existingAsset) => !newAssetRefKeys.has(`${existingAsset.id}-${existingAsset.type}`)
  );
  await deleteKibanaAssets({ installedObjects: assetsToRemove, packageInfo });

  // Save the new asset references
  await saveKibanaAssetsRefs(savedObjectsClient, pkgName, assetRefs);

  // Update the package installation status
  await savedObjectsClient.update<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName, {
    version: pkgVersion,
    install_version: pkgVersion,
    install_status: 'installed',
    install_format_schema_version: FLEET_INSTALL_FORMAT_VERSION,
  });

  return {
    assets: assetRefs,
    status: 'installed',
    installType: 'install',
    installSource,
  };
}

async function installKibanaAssets(
  savedObjectsClient: SavedObjectsClientContract,
  archiveBuffer: Buffer,
  contentType: string
) {
  const assetRefs: KibanaAssetReference[] = [];
  let batch: ArchiveAsset[] = [];

  const onEntry = async ({ path, buffer }: ArchiveEntry) => {
    if (!buffer || !isKibanaAssetType(path)) {
      return;
    }
    const savedObject = JSON.parse(buffer.toString('utf8')) as ArchiveAsset;
    const assetType = getPathParts(path).type as KibanaAssetType;
    const soType = KibanaSavedObjectTypeMapping[assetType];
    if (savedObject.type !== soType) {
      return;
    }

    batch.push(savedObject);
    assetRefs.push(toAssetReference(savedObject));

    if (batch.length >= MAX_ASSETS_TO_INSTALL_IN_PARALLEL) {
      await writeSavedObjects({
        savedObjectsClient,
        kibanaAssets: batch,
        refresh: false,
      });
      batch = [];
    }
  };

  await traverseArchiveEntries(archiveBuffer, contentType, onEntry);

  // install any remaining assets
  if (batch.length) {
    await writeSavedObjects({
      savedObjectsClient,
      kibanaAssets: batch,
      refresh: false,
    });
  }
  return assetRefs;
}

async function writeSavedObjects({
  savedObjectsClient,
  kibanaAssets,
  refresh,
}: {
  kibanaAssets: ArchiveAsset[];
  savedObjectsClient: SavedObjectsClientContract;
  refresh?: boolean | 'wait_for';
}) {
  if (!kibanaAssets.length) {
    return [];
  }

  const toBeSavedObjects = kibanaAssets.map((asset) => createSavedObjectKibanaAsset(asset));

  const { saved_objects: createdSavedObjects } = await savedObjectsClient.bulkCreate(
    toBeSavedObjects,
    {
      // We only want to install new saved objects without overwriting existing ones
      overwrite: false,
      managed: true,
      refresh,
    }
  );

  return createdSavedObjects;
}
