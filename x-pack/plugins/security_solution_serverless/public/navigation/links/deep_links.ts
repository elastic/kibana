/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeepLinksFormatter } from '@kbn/security-solution-plugin/public/common/links/deep_links';
import { AppNavLinkStatus } from '@kbn/core/public';

export const formatProjectDeepLinks: DeepLinksFormatter = (appLinks) =>
  appLinks.map((appLink) => ({
    id: appLink.id,
    path: appLink.path,
    title: appLink.title,
    searchable: !appLink.globalSearchDisabled,
    navLinkStatus: appLink.sideNavDisabled ? AppNavLinkStatus.hidden : AppNavLinkStatus.visible,
    ...(appLink.globalSearchKeywords != null ? { keywords: appLink.globalSearchKeywords } : {}),
    ...(appLink.links && appLink.links?.length
      ? {
          deepLinks: formatProjectDeepLinks(appLink.links),
        }
      : {}),
  }));
