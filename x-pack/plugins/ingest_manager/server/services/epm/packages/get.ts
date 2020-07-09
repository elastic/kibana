/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { isPackageLimited } from '../../../../common';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { Installation, InstallationStatus, PackageInfo, KibanaAssetType } from '../../../types';
import * as Registry from '../registry';
import { createInstallableFrom, isRequiredPackage } from './index';

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

// Get package names for packages which cannot have more than one package config on an agent config
// Assume packages only export one config template for now
export async function getLimitedPackages(options: {
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<string[]> {
  const { savedObjectsClient } = options;
  const allPackages = await getPackages({ savedObjectsClient, experimental: true });
  const installedPackages = allPackages.filter(
    (pkg) => (pkg.status = InstallationStatus.installed)
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
  return installedPackagesInfo.filter((pkgInfo) => isPackageLimited).map((pkgInfo) => pkgInfo.name);
}

export async function getPackageSavedObjects(savedObjectsClient: SavedObjectsClientContract) {
  return savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
  });
}

export async function getPackageKeysByStatus(
  savedObjectsClient: SavedObjectsClientContract,
  status: InstallationStatus
) {
  const allPackages = await getPackages({ savedObjectsClient });
  return allPackages.reduce<Array<{ pkgName: string; pkgVersion: string }>>((acc, pkg) => {
    if (pkg.status === status) {
      acc.push({ pkgName: pkg.name, pkgVersion: pkg.version });
    }
    return acc;
  }, []);
}

export async function getPackageInfo(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
  pkgVersion: string;
}): Promise<PackageInfo> {
  const { savedObjectsClient, pkgName, pkgVersion } = options;
  const [item, savedObject, latestPackage, assets] = await Promise.all([
    Registry.fetchInfo(pkgName, pkgVersion),
    getInstallationObject({ savedObjectsClient, pkgName }),
    Registry.fetchFindLatestPackage(pkgName),
    Registry.getArchiveInfo(pkgName, pkgVersion),
  ]);

  // add properties that aren't (or aren't yet) on Registry response
  const updated = {
    ...item,
    latestVersion: latestPackage.version,
    title: item.title || nameAsTitle(item.name),
    assets: Registry.groupPathsByService(assets || []),
    removable: !isRequiredPackage(pkgName),
  };
  return createInstallableFrom(updated, savedObject);
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
