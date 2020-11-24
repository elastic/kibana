/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract, SavedObjectsFindOptions } from 'src/core/server';
import { isPackageLimited, installationStatuses } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { ArchivePackage, InstallSource, RegistryPackage } from '../../../../common/types';
import { Installation, PackageInfo, KibanaAssetType } from '../../../types';
import * as Registry from '../registry';
import { createInstallableFrom, isRequiredPackage } from './index';
import { getArchivePackage } from '../archive';

export { fetchFile as getFile, SearchParams } from '../registry';

function nameAsTitle(name: string) {
  return name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
}

export async function getCategories(options: Registry.CategoriesParams) {
  return Registry.fetchCategories(options);
}

export async function getPackages(
  options: {
    savedObjectsClient: SavedObjectsClientContract;
  } & Registry.SearchParams
) {
  const { savedObjectsClient, experimental, category } = options;
  const registryItems = await Registry.fetchList({ category, experimental }).then((items) => {
    return items.map((item) =>
      Object.assign({}, item, { title: item.title || nameAsTitle(item.name) })
    );
  });
  // get the installed packages
  const packageSavedObjects = await getPackageSavedObjects(savedObjectsClient);

  // filter out any internal packages
  const savedObjectsVisible = packageSavedObjects.saved_objects.filter(
    (o) => !o.attributes.internal
  );
  const packageList = registryItems
    .map((item) =>
      createInstallableFrom(
        item,
        savedObjectsVisible.find(({ id }) => id === item.name)
      )
    )
    .sort(sortByName);
  return packageList;
}

// Get package names for packages which cannot have more than one package policy on an agent policy
// Assume packages only export one policy template for now
export async function getLimitedPackages(options: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<string[]> {
  const { savedObjectsClient } = options;
  const allPackages = await getPackages({ savedObjectsClient, experimental: true });
  const installedPackages = allPackages.filter(
    (pkg) => pkg.status === installationStatuses.Installed
  );
  const installedPackagesInfo = await Promise.all(
    installedPackages.map((pkgInstall) => {
      return getPackageInfo({
        savedObjectsClient,
        pkgName: pkgInstall.name,
        pkgVersion: pkgInstall.version,
      });
    })
  );
  return installedPackagesInfo.filter(isPackageLimited).map((pkgInfo) => pkgInfo.name);
}

export async function getPackageSavedObjects(
  savedObjectsClient: SavedObjectsClientContract,
  options?: Omit<SavedObjectsFindOptions, 'type'>
) {
  return savedObjectsClient.find<Installation>({
    ...(options || {}),
    type: PACKAGES_SAVED_OBJECT_TYPE,
  });
}

export async function getPackageInfo(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
}): Promise<PackageInfo> {
  const { savedObjectsClient, pkgName, pkgVersion } = options;
  const [savedObject, latestPackage] = await Promise.all([
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchFindLatestPackage(pkgName),
  ]);

  const getPackageRes = await getPackageFromSource({
    pkgName,
    pkgVersion,
    pkgInstallSource: savedObject?.attributes.install_source,
  });
  const paths = getPackageRes.paths;
  const packageInfo = getPackageRes.packageInfo;

  // add properties that aren't (or aren't yet) on the package
  const updated = {
    ...packageInfo,
    latestVersion: latestPackage.version,
    title: packageInfo.title || nameAsTitle(packageInfo.name),
    assets: Registry.groupPathsByService(paths || []),
    removable: !isRequiredPackage(pkgName),
  };
  return createInstallableFrom(updated, savedObject);
}

// gets package from install_source if it exists otherwise gets from registry
export async function getPackageFromSource(options: {
  pkgName: string;
  pkgVersion: string;
  pkgInstallSource?: InstallSource;
}): Promise<{
  paths: string[] | undefined;
  packageInfo: RegistryPackage | ArchivePackage;
}> {
  const { pkgName, pkgVersion, pkgInstallSource } = options;
  // TODO: Check package storage before checking registry
  let res;
  if (pkgInstallSource === 'upload') {
    res = getArchivePackage({
      name: pkgName,
      version: pkgVersion,
    });
  } else {
    res = await Registry.getRegistryPackage(pkgName, pkgVersion);
  }
  if (!res.packageInfo || !res.paths)
    throw new Error(`package info for ${pkgName}-${pkgVersion} does not exist`);
  return {
    paths: res.paths,
    packageInfo: res.packageInfo,
  };
}

export async function getInstallationObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}) {
  const { savedObjectsClient, pkgName } = options;
  return savedObjectsClient
    .get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgName)
    .catch((e) => undefined);
}

export async function getInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}) {
  const savedObject = await getInstallationObject(options);
  return savedObject?.attributes;
}

function sortByName(a: { name: string }, b: { name: string }) {
  if (a.name > b.name) {
    return 1;
  } else if (a.name < b.name) {
    return -1;
  } else {
    return 0;
  }
}

export async function getKibanaSavedObject(
  savedObjectsClient: SavedObjectsClientContract,
  type: KibanaAssetType,
  id: string
) {
  return savedObjectsClient.get(type, id);
}
