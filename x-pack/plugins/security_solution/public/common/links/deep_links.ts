/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Subject, Subscription } from 'rxjs';
import { combineLatestWith } from 'rxjs';
import type { AppDeepLink, AppUpdater, AppDeepLinkLocations } from '@kbn/core/public';
import { appLinks$ } from './links';
import type { AppLinkItems } from './types';

type DeepLinksFormatter = (appLinks: AppLinkItems) => AppDeepLink[];

// TODO: remove after rollout https://github.com/elastic/kibana/issues/179572
const classicFormatter: DeepLinksFormatter = (appLinks) =>
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
            deepLinks: classicFormatter(appLink.links),
          }
        : {}),
    };
    return deepLink;
  });

const solutionFormatter: DeepLinksFormatter = (appLinks) =>
  appLinks.map((appLink) => {
    const visibleIn: Set<AppDeepLinkLocations> = new Set(appLink.visibleIn ?? []);
    if (!appLink.globalSearchDisabled) {
      visibleIn.add('globalSearch');
    }
    if (!appLink.sideNavDisabled) {
      visibleIn.add('sideNav');
    }
    const deepLink: AppDeepLink = {
      id: appLink.id,
      path: appLink.path,
      title: appLink.title,
      visibleIn: Array.from(visibleIn),
      ...(appLink.globalSearchKeywords != null ? { keywords: appLink.globalSearchKeywords } : {}),
      ...(appLink.links && appLink.links?.length
        ? {
            deepLinks: solutionFormatter(appLink.links),
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
  isSolutionNavigationEnabled$: Subject<boolean>
): Subscription => {
  return appLinks$
    .pipe(combineLatestWith(isSolutionNavigationEnabled$))
    .subscribe(([appLinks, isSolutionNavigationEnabled]) => {
      appUpdater$.next(() => ({
        deepLinks: isSolutionNavigationEnabled
          ? solutionFormatter(appLinks)
          : classicFormatter(appLinks),
      }));
    });
};
