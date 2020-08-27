/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

const cache: Map<string, Buffer> = new Map();
export const cacheGet = (key: string) => cache.get(key);
export const cacheSet = (key: string, value: Buffer) => cache.set(key, value);
export const cacheHas = (key: string) => cache.has(key);

const archiveKeyCache: Map<string, string> = new Map();
const stableKey = JSON.stringify;
export const getArchiveKey = (name: string, version: string) =>
  archiveKeyCache.get(stableKey({ name, version }));
export const setArchiveKey = (name: string, version: string, location: string) =>
  archiveKeyCache.set(stableKey({ name, version }), location);
