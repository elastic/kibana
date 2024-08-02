/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type { IUiSettingsClient, DocLinksStart, ChromeRecentlyAccessed } from '@kbn/core/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';

export interface DependencyCache {
  timefilter: DataPublicPluginSetup['query']['timefilter'] | null;
  config: IUiSettingsClient | null;
  docLinks: DocLinksStart | null;
  recentlyAccessed: ChromeRecentlyAccessed | null;
  maps: MapsStartApi | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  docLinks: null,
  recentlyAccessed: null,
  maps: null,
};

export function setDependencyCache(deps: Partial<DependencyCache>) {
  cache.timefilter = deps.timefilter || null;
  cache.config = deps.config || null;
  cache.docLinks = deps.docLinks || null;
  cache.recentlyAccessed = deps.recentlyAccessed || null;
}

export function getTimefilter() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.timefilter;
}

export function getDocLinks() {
  if (cache.docLinks === null) {
    throw new Error("docLinks hasn't been initialized");
  }
  return cache.docLinks;
}

export function getUiSettings() {
  if (cache.config === null) {
    throw new Error("uiSettings hasn't been initialized");
  }
  return cache.config;
}

export function getRecentlyAccessed() {
  if (cache.recentlyAccessed === null) {
    throw new Error("recentlyAccessed hasn't been initialized");
  }
  return cache.recentlyAccessed;
}

export function clearCache() {
  Object.keys(cache).forEach((k) => {
    cache[k as keyof DependencyCache] = null;
  });
}
