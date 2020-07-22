/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataPublicPluginSetup } from 'src/plugins/data/public';
import {
  IUiSettingsClient,
  ChromeStart,
  SavedObjectsClientContract,
  ApplicationStart,
  HttpStart,
  I18nStart,
} from 'kibana/public';
import { IndexPatternsContract, DataPublicPluginStart } from 'src/plugins/data/public';
import {
  DocLinksStart,
  ToastsStart,
  OverlayStart,
  ChromeRecentlyAccessed,
  IBasePath,
} from 'kibana/public';
import { SharePluginStart } from 'src/plugins/share/public';
import { SecurityPluginSetup } from '../../../../security/public';

export interface DependencyCache {
  timefilter: DataPublicPluginSetup['query']['timefilter'] | null;
  config: IUiSettingsClient | null;
  indexPatterns: IndexPatternsContract | null;
  chrome: ChromeStart | null;
  docLinks: DocLinksStart | null;
  toastNotifications: ToastsStart | null;
  overlays: OverlayStart | null;
  recentlyAccessed: ChromeRecentlyAccessed | null;
  fieldFormats: DataPublicPluginStart['fieldFormats'] | null;
  autocomplete: DataPublicPluginStart['autocomplete'] | null;
  basePath: IBasePath | null;
  savedObjectsClient: SavedObjectsClientContract | null;
  application: ApplicationStart | null;
  http: HttpStart | null;
  security: SecurityPluginSetup | undefined | null;
  i18n: I18nStart | null;
  urlGenerators: SharePluginStart['urlGenerators'] | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  indexPatterns: null,
  chrome: null,
  docLinks: null,
  toastNotifications: null,
  overlays: null,
  recentlyAccessed: null,
  fieldFormats: null,
  autocomplete: null,
  basePath: null,
  savedObjectsClient: null,
  application: null,
  http: null,
  security: null,
  i18n: null,
  urlGenerators: null,
};

export function setDependencyCache(deps: Partial<DependencyCache>) {
  cache.timefilter = deps.timefilter || null;
  cache.config = deps.config || null;
  cache.chrome = deps.chrome || null;
  cache.indexPatterns = deps.indexPatterns || null;
  cache.docLinks = deps.docLinks || null;
  cache.toastNotifications = deps.toastNotifications || null;
  cache.overlays = deps.overlays || null;
  cache.recentlyAccessed = deps.recentlyAccessed || null;
  cache.fieldFormats = deps.fieldFormats || null;
  cache.autocomplete = deps.autocomplete || null;
  cache.basePath = deps.basePath || null;
  cache.savedObjectsClient = deps.savedObjectsClient || null;
  cache.application = deps.application || null;
  cache.http = deps.http || null;
  cache.security = deps.security || null;
  cache.i18n = deps.i18n || null;
  cache.urlGenerators = deps.urlGenerators || null;
}

export function getTimefilter() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.timefilter;
}
export function getTimeHistory() {
  if (cache.timefilter === null) {
    throw new Error("timefilter hasn't been initialized");
  }
  return cache.timefilter.history;
}

export function getDocLinks() {
  if (cache.docLinks === null) {
    throw new Error("docLinks hasn't been initialized");
  }
  return cache.docLinks;
}

export function getToastNotifications() {
  if (cache.toastNotifications === null) {
    throw new Error("toast notifications haven't been initialized");
  }
  return cache.toastNotifications;
}

export function getOverlays() {
  if (cache.overlays === null) {
    throw new Error("overlays haven't been initialized");
  }
  return cache.overlays;
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

export function getFieldFormats() {
  if (cache.fieldFormats === null) {
    throw new Error("fieldFormats hasn't been initialized");
  }
  return cache.fieldFormats;
}

export function getAutocomplete() {
  if (cache.autocomplete === null) {
    throw new Error("autocomplete hasn't been initialized");
  }
  return cache.autocomplete;
}

export function getChrome() {
  if (cache.chrome === null) {
    throw new Error("chrome hasn't been initialized");
  }
  return cache.chrome;
}

export function getBasePath() {
  if (cache.basePath === null) {
    throw new Error("basePath hasn't been initialized");
  }
  return cache.basePath;
}

export function getSavedObjectsClient() {
  if (cache.savedObjectsClient === null) {
    throw new Error("savedObjectsClient hasn't been initialized");
  }
  return cache.savedObjectsClient;
}

export function getApplication() {
  if (cache.application === null) {
    throw new Error("application hasn't been initialized");
  }
  return cache.application;
}

export function getHttp() {
  if (cache.http === null) {
    throw new Error("http hasn't been initialized");
  }
  return cache.http;
}

export function getSecurity() {
  if (cache.security === null) {
    throw new Error("security hasn't been initialized");
  }
  return cache.security;
}

export function getI18n() {
  if (cache.i18n === null) {
    throw new Error("i18n hasn't been initialized");
  }
  return cache.i18n;
}

export function getGetUrlGenerator() {
  if (cache.urlGenerators === null) {
    throw new Error("urlGenerators hasn't been initialized");
  }
  return cache.urlGenerators.getUrlGenerator;
}

export function clearCache() {
  console.log('clearing dependency cache'); // eslint-disable-line no-console
  Object.keys(cache).forEach((k) => {
    cache[k as keyof DependencyCache] = null;
  });
}
