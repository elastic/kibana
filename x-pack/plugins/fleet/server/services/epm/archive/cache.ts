/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pkgToPkgKey } from '../registry/index';
import { ArchiveEntry } from './index';
import { ArchivePackage, RegistryPackage } from '../../../../common';

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
export const getPackageInfo = (name: string, version: string) => {
  return packageInfoCache.get(pkgToPkgKey({ name, version }));
};
