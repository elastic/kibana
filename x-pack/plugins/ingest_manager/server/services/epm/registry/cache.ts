/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { pkgToPkgKey } from './index';

const cache: Map<string, Buffer> = new Map();
export const cacheGet = (key: string) => cache.get(key);
export const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
export const cacheHas = (key: string) => cache.has(key);
export const cacheClear = () => cache.clear();
export const cacheDelete = (key: string) => cache.delete(key);

const archiveLocationCache: Map<string, string> = new Map();
export const getArchiveLocation = (name: string, version: string) =>
  archiveLocationCache.get(pkgToPkgKey({ name, version }));

export const setArchiveLocation = (name: string, version: string, location: string) =>
  archiveLocationCache.set(pkgToPkgKey({ name, version }), location);

export const deleteArchiveLocation = (name: string, version: string) =>
  archiveLocationCache.delete(pkgToPkgKey({ name, version }));

const archiveFilelistCache: Map<string, string[]> = new Map();
export const getArchiveFilelist = (name: string, version: string) =>
  archiveFilelistCache.get(pkgToPkgKey({ name, version }));

export const setArchiveFilelist = (name: string, version: string, paths: string[]) =>
  archiveFilelistCache.set(pkgToPkgKey({ name, version }), paths);

export const deleteArchiveFilelist = (name: string, version: string) =>
  archiveFilelistCache.delete(pkgToPkgKey({ name, version }));
