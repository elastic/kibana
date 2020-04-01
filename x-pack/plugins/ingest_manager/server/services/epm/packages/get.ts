/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { PACKAGES_SAVED_OBJECT_TYPE } from '../../../constants';
import { Installation, InstallationStatus, PackageInfo } from '../../../types';
import * as Registry from '../registry';
import { createInstallableFrom } from './index';

export { fetchFile as getFile, SearchParams } from '../registry';

function nameAsTitle(name: string) {
  return name.charAt(0).toUpperCase() + name.substr(1).toLowerCase();
}

export async function getCategories() {
  return Registry.fetchCategories();
}

export async function getPackages(
  options: {
    savedObjectsClient: SavedObjectsClientContract;
  } & Registry.SearchParams
) {
  const { savedObjectsClient } = options;
  const registryItems = await Registry.fetchList({ category: options.category }).then(items => {
    return items.map(item =>
      Object.assign({}, item, { title: item.title || nameAsTitle(item.name) })
    );
  });
  const searchObjects = registryItems.map(({ name, version }) => ({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    id: `${name}-${version}`,
  }));
  const results = await savedObjectsClient.bulkGet<Installation>(searchObjects);
  const savedObjects = results.saved_objects.filter(o => !o.error); // ignore errors for now
  const packageList = registryItems
    .map(item =>
      createInstallableFrom(
        item,
        savedObjects.find(({ id }) => id === `${item.name}-${item.version}`)
      )
    )
    .sort(sortByName);
  return packageList;
}

export async function getPackageKeysByStatus(
  savedObjectsClient: SavedObjectsClientContract,
  status: InstallationStatus
) {
  const allPackages = await getPackages({ savedObjectsClient });
  return allPackages.reduce<string[]>((acc, pkg) => {
    if (pkg.status === status) {
      acc.push(`${pkg.name}-${pkg.version}`);
    }
    return acc;
  }, []);
}

export async function getPackageInfo(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}): Promise<PackageInfo> {
  const { savedObjectsClient, pkgkey } = options;
  const [item, savedObject] = await Promise.all([
    Registry.fetchInfo(pkgkey),
    getInstallationObject({ savedObjectsClient, pkgkey }),
    Registry.getArchiveInfo(pkgkey),
  ] as const);
  // adding `as const` due to regression in TS 3.7.2
  // see https://github.com/microsoft/TypeScript/issues/34925#issuecomment-550021453
  // and https://github.com/microsoft/TypeScript/pull/33707#issuecomment-550718523

  // add properties that aren't (or aren't yet) on Registry response
  const updated = {
    ...item,
    title: item.title || nameAsTitle(item.name),
    assets: Registry.groupPathsByService(item?.assets || []),
  };
  return createInstallableFrom(updated, savedObject);
}

export async function getInstallationObject(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const { savedObjectsClient, pkgkey } = options;
  return savedObjectsClient
    .get<Installation>(PACKAGES_SAVED_OBJECT_TYPE, pkgkey)
    .catch(e => undefined);
}

export async function getInstallation(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgkey: string;
}) {
  const savedObject = await getInstallationObject(options);
  return savedObject?.attributes;
}

export async function findInstalledPackageByName(options: {
  savedObjectsClient: SavedObjectsClientContract;
  pkgName: string;
}): Promise<Installation | undefined> {
  const { savedObjectsClient, pkgName } = options;

  const res = await savedObjectsClient.find<Installation>({
    type: PACKAGES_SAVED_OBJECT_TYPE,
    search: pkgName,
    searchFields: ['name'],
  });
  if (res.saved_objects.length) return res.saved_objects[0].attributes;
  return undefined;
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
