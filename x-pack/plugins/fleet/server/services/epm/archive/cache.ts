/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pkgToPkgKey } from '../registry/index';
import { ArchiveEntry } from './index';
import { InstallSource, ArchivePackage, RegistryPackage } from '../../../../common';

const archiveEntryCache: Map<ArchiveEntry['path'], ArchiveEntry['buffer']> = new Map();
export const getArchiveEntry = (key: string) => archiveEntryCache.get(key);
export const setArchiveEntry = (key: string, value: Buffer) => archiveEntryCache.set(key, value);
export const hasArchiveEntry = (key: string) => archiveEntryCache.has(key);
export const clearArchiveEntries = () => archiveEntryCache.clear();
export const deleteArchiveEntry = (key: string) => archiveEntryCache.delete(key);

type ArchiveFilelist = string[];
const archiveFilelistCache: Map<string, ArchiveFilelist> = new Map();
export const getArchiveFilelist = (name: string, version: string) =>
  archiveFilelistCache.get(pkgToPkgKey({ name, version }));

export const setArchiveFilelist = (name: string, version: string, paths: string[]) =>
  archiveFilelistCache.set(pkgToPkgKey({ name, version }), paths);

export const deleteArchiveFilelist = (name: string, version: string) =>
  archiveFilelistCache.delete(pkgToPkgKey({ name, version }));

const packageInfoCache: Map<string, ArchivePackage | RegistryPackage> = new Map();
interface PackageInfoParams {
  name: string;
  version: string;
  installSource: InstallSource;
}
const getPackageInfoKey = ({ name, version, installSource }: PackageInfoParams) =>
  `${name}-${version}-${installSource}`;
export const getPackageInfo = (args: PackageInfoParams) => {
  const packageInfo = packageInfoCache.get(getPackageInfoKey(args));
  if (args.installSource === 'registry') {
    return packageInfo as RegistryPackage;
  } else if (args.installSource === 'upload') {
    return packageInfo as ArchivePackage;
  } else {
    throw new Error(`Unknown installSource: ${args.installSource}`);
  }
};

export const setPackageInfo = ({
  name,
  version,
  installSource,
  packageInfo,
}: PackageInfoParams & { packageInfo: ArchivePackage | RegistryPackage }) => {
  const key = getPackageInfoKey({ name, version, installSource });
  return packageInfoCache.set(key, packageInfo);
};
