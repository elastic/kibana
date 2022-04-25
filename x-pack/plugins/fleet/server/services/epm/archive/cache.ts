/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ArchivePackage, RegistryPackage } from '../../../../common';
import { appContextService } from '../..';

import type { ArchiveEntry } from '.';

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

export const setArchiveFilelist = (keyArgs: SharedKey, paths: string[]) => {
  const logger = appContextService.getLogger();
  logger.debug(`setting file list to the cache for ${keyArgs.name}-${keyArgs.version}`);
  logger.trace(JSON.stringify(paths));
  return archiveFilelistCache.set(sharedKey(keyArgs), paths);
};

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
  if (!paths || !packageInfo) return undefined;
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
  const logger = appContextService.getLogger();
  const key = sharedKey({ name, version });
  logger.debug(`setting package info to the cache for ${name}-${version}`);
  logger.trace(JSON.stringify(packageInfo));
  return packageInfoCache.set(key, packageInfo);
};

export const deletePackageInfo = (args: SharedKey) => packageInfoCache.delete(sharedKey(args));

export const clearPackageFileCache = (args: SharedKey) => {
  const fileList = getArchiveFilelist(args) ?? [];
  fileList.forEach((filePath) => {
    deleteArchiveEntry(filePath);
  });
  deleteArchiveFilelist(args);
};
