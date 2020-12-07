/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ArchiveEntry } from './index';
import { ArchivePackage, RegistryPackage } from '../../../../common';

const archiveEntryCache: Map<ArchiveEntry['path'], ArchiveEntry['buffer']> = new Map();
export const getArchiveEntry = (key: string) => archiveEntryCache.get(key);
export const setArchiveEntry = (key: string, value: Buffer) => archiveEntryCache.set(key, value);
export const hasArchiveEntry = (key: string) => archiveEntryCache.has(key);
export const clearArchiveEntries = () => archiveEntryCache.clear();
export const deleteArchiveEntry = (key: string) => archiveEntryCache.delete(key);

export interface SharedKey {
  name: string;
  version: string;
}
type SharedKeyString = string;

const archiveFilelistCache: Map<SharedKeyString, string[]> = new Map();
export const getArchiveFilelist = (keyArgs: SharedKey) =>
  archiveFilelistCache.get(sharedKey(keyArgs));

export const setArchiveFilelist = (keyArgs: SharedKey, paths: string[]) =>
  archiveFilelistCache.set(sharedKey(keyArgs), paths);

export const deleteArchiveFilelist = (keyArgs: SharedKey) =>
  archiveFilelistCache.delete(sharedKey(keyArgs));

const packageInfoCache: Map<SharedKeyString, ArchivePackage | RegistryPackage> = new Map();
const sharedKey = ({ name, version }: SharedKey) => `${name}-${version}`;

export const getPackageInfo = (args: SharedKey) => {
  return packageInfoCache.get(sharedKey(args));
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
  packageInfo,
}: SharedKey & { packageInfo: ArchivePackage | RegistryPackage }) => {
  const key = sharedKey({ name, version });
  return packageInfoCache.set(key, packageInfo);
};

export const deletePackageInfo = (args: SharedKey) => packageInfoCache.delete(sharedKey(args));
