/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ArchiveEntry } from './index';
import { InstallSource, ArchivePackage, RegistryPackage } from '../../../../common';

const archiveEntryCache: Map<ArchiveEntry['path'], ArchiveEntry['buffer']> = new Map();
export const getArchiveEntry = (key: string) => archiveEntryCache.get(key);
export const setArchiveEntry = (key: string, value: Buffer) => archiveEntryCache.set(key, value);
export const hasArchiveEntry = (key: string) => archiveEntryCache.has(key);
export const clearArchiveEntries = () => archiveEntryCache.clear();
export const deleteArchiveEntry = (key: string) => archiveEntryCache.delete(key);

export interface SharedKey {
  name: string;
  version: string;
  installSource: InstallSource;
}
type SharedKeyString = string;

type ArchiveFilelist = string[];
const archiveFilelistCache: Map<SharedKeyString, ArchiveFilelist> = new Map();
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

export const setPackageInfo = ({
  name,
  version,
  installSource,
  packageInfo,
}: SharedKey & { packageInfo: ArchivePackage | RegistryPackage }) => {
  const key = sharedKey({ name, version, installSource });
  return packageInfoCache.set(key, packageInfo);
};
