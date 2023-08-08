/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject, Subscription } from 'rxjs';
import { AppNavLinkStatus } from '@kbn/core/public';
import type { AppDeepLink, AppUpdater } from '@kbn/core/public';
import { appLinks$ } from './links';
import type { AppLinkItems } from './types';

const formatDeepLinks = (appLinks: AppLinkItems): AppDeepLink[] =>
  appLinks.map((appLink) => ({
    id: appLink.id,
    path: appLink.path,
    title: appLink.title,
    searchable: !appLink.globalSearchDisabled,
    ...(appLink.globalNavPosition != null
      ? { navLinkStatus: AppNavLinkStatus.visible, order: appLink.globalNavPosition }
      : { navLinkStatus: AppNavLinkStatus.hidden }),
    ...(appLink.globalSearchKeywords != null ? { keywords: appLink.globalSearchKeywords } : {}),
    ...(appLink.links && appLink.links?.length
      ? {
          deepLinks: formatDeepLinks(appLink.links),
        }
      : {}),
  }));

/**
 * Registers any change in appLinks to be updated in app deepLinks
 */
export const registerDeepLinksUpdater = (appUpdater$: Subject<AppUpdater>): Subscription => {
  return appLinks$.subscribe((appLinks) => {
    appUpdater$.next(() => ({
      navLinkStatus: AppNavLinkStatus.hidden, // needed to prevent main security link to switch to visible after update
      deepLinks: formatDeepLinks(appLinks),
    }));
  });
};
