/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject, Subscription } from 'rxjs';
import type { AppDeepLink, AppUpdater, AppDeepLinkLocations } from '@kbn/core/public';
import { appLinks$ } from './links';
import type { AppLinkItems } from './types';

export type DeepLinksFormatter = (appLinks: AppLinkItems) => AppDeepLink[];

const defaultDeepLinksFormatter: DeepLinksFormatter = (appLinks) =>
  appLinks.map((appLink) => {
    const visibleIn: Set<AppDeepLinkLocations> = new Set(appLink.visibleIn ?? []);
    if (!appLink.globalSearchDisabled) {
      visibleIn.add('globalSearch');
    }
    if (appLink.globalNavPosition != null) {
      visibleIn.add('sideNav');
    }
    const deepLink: AppDeepLink = {
      id: appLink.id,
      path: appLink.path,
      title: appLink.title,
      visibleIn: Array.from(visibleIn),
      ...(appLink.globalNavPosition != null ? { order: appLink.globalNavPosition } : {}),
      ...(appLink.globalSearchKeywords != null ? { keywords: appLink.globalSearchKeywords } : {}),
      ...(appLink.links && appLink.links?.length
        ? {
            deepLinks: defaultDeepLinksFormatter(appLink.links),
          }
        : {}),
    };
    return deepLink;
  });

/**
 * Registers any change in appLinks to be updated in app deepLinks
 */
export const registerDeepLinksUpdater = (
  appUpdater$: Subject<AppUpdater>,
  formatter: DeepLinksFormatter = defaultDeepLinksFormatter
): Subscription => {
  return appLinks$.subscribe((appLinks) => {
    appUpdater$.next(() => ({
      deepLinks: formatter(appLinks),
    }));
  });
};
