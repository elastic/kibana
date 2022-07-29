/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

type CacheKey = string;
const versionFileCache: Map<CacheKey, string> = new Map();

export const getCachedVersionFile = (key: CacheKey) => {
  return versionFileCache.get(key);
};

export const setCachedFile = (key: CacheKey, fileContent: string) => {
  return versionFileCache.set(key, fileContent);
};
