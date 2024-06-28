/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataPublicPluginSetup } from '@kbn/data-plugin/public';
import type {
  IUiSettingsClient,
  ApplicationStart,
  HttpStart,
  I18nStart,
  DocLinksStart,
  ToastsStart,
  ChromeRecentlyAccessed,
} from '@kbn/core/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import type { MapsStartApi } from '@kbn/maps-plugin/public';

export interface DependencyCache {
  timefilter: DataPublicPluginSetup['query']['timefilter'] | null;
  config: IUiSettingsClient | null;
  docLinks: DocLinksStart | null;
  toastNotifications: ToastsStart | null;
  recentlyAccessed: ChromeRecentlyAccessed | null;
  fieldFormats: FieldFormatsStart | null;
  application: ApplicationStart | null;
  http: HttpStart | null;
  i18n: I18nStart | null;
  maps: MapsStartApi | null;
}

const cache: DependencyCache = {
  timefilter: null,
  config: null,
  docLinks: null,
  toastNotifications: null,
  recentlyAccessed: null,
  fieldFormats: null,
  application: null,
  http: null,
  i18n: null,
  maps: null,
};

export function setDependencyCache(deps: Partial<DependencyCache>) {
  cache.timefilter = deps.timefilter || null;
  cache.config = deps.config || null;
  cache.docLinks = deps.docLinks || null;
  cache.toastNotifications = deps.toastNotifications || null;
  cache.recentlyAccessed = deps.recentlyAccessed || null;
  cache.fieldFormats = deps.fieldFormats || null;
  cache.application = deps.application || null;
  cache.http = deps.http || null;
  cache.i18n = deps.i18n || null;
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

export function getToastNotifications() {
  if (cache.toastNotifications === null) {
    throw new Error("toast notifications haven't been initialized");
  }
  return cache.toastNotifications;
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

export function getI18n() {
  if (cache.i18n === null) {
    throw new Error("i18n hasn't been initialized");
  }
  return cache.i18n;
}

export function clearCache() {
  Object.keys(cache).forEach((k) => {
    cache[k as keyof DependencyCache] = null;
  });
}
