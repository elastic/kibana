/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppDeepLink, AppDeepLinkLocations } from '@kbn/core-application-browser';
import type { DeepLinksFormatter } from '@kbn/security-solution-plugin/public/common/links/deep_links';

export const formatProjectDeepLinks: DeepLinksFormatter = (appLinks) =>
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
            deepLinks: formatProjectDeepLinks(appLink.links),
          }
        : {}),
    };
    return deepLink;
  });
