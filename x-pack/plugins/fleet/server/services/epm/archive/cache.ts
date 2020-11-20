/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pkgToPkgKey } from '../registry/index';

const cache: Map<string, Buffer> = new Map();
export const cacheGet = (key: string) => cache.get(key);
export const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
export const cacheHas = (key: string) => cache.has(key);
export const cacheClear = () => cache.clear();
export const cacheDelete = (key: string) => cache.delete(key);

export const getArchiveFilelist = (keyArgs: SharedKey) =>
  archiveFilelistCache.get(sharedKey(keyArgs));

export const setArchiveFilelist = (keyArgs: SharedKey, paths: string[]) =>
  archiveFilelistCache.set(sharedKey(keyArgs), paths);

export const deleteArchiveFilelist = (keyArgs: SharedKey) =>
  archiveFilelistCache.delete(sharedKey(keyArgs));

const packageInfoCache: Map<SharedKeyString, ArchivePackage | RegistryPackage> = new Map();
const sharedKey = ({ name, version, installSource }: SharedKey) =>
  `${name}-${version}-${installSource}`;

export const getPackageInfo = (args: SharedKey) => {
  const packageInfo = packageInfoCache.get(sharedKey(args));
  if (args.installSource === 'registry') {
    return packageInfo as RegistryPackage;
  } else if (args.installSource === 'upload') {
    return packageInfo as ArchivePackage;
  } else {
    throw new Error(`Unknown installSource: ${args.installSource}`);
  }
};

export const getArchivePackage = (args: SharedKey) => {
  const packageInfo = getPackageInfo(args);
  const paths = getArchiveFilelist(args);
  return {
    paths,
    packageInfo,
  };
};

export const setPackageInfo = ({
  name,
  version,
  installSource,
  packageInfo,
}: SharedKey & { packageInfo: ArchivePackage | RegistryPackage }) => {
  const key = sharedKey({ name, version, installSource });
  return packageInfoCache.set(key, packageInfo);
};

export const deletePackageInfo = (args: SharedKey) => packageInfoCache.delete(sharedKey(args));
