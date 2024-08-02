/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';

export interface DependencyCache {
  timefilter: DataPublicPluginSetup['query']['timefilter'] | null;
}

const cache: DependencyCache = {
  timefilter: null,
};

export function setDependencyCache(deps: Partial<DependencyCache>) {
  cache.timefilter = deps.timefilter || null;
}

export function getTimefilter() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.timefilter;
}

export function clearCache() {
  Object.keys(cache).forEach((k) => {
    cache[k as keyof DependencyCache] = null;
  });
}
