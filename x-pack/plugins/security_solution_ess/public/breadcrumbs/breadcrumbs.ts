/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { Services } from '../common/services';

export const subscribeBreadcrumbs = (services: Services) => {
  const { chrome, securitySolution } = services;
  securitySolution.getBreadcrumbsNav$().subscribe((breadcrumbsNav) => {
    const breadcrumbs = [...breadcrumbsNav.leading, ...breadcrumbsNav.trailing];
    if (breadcrumbs.length > 0) {
      chrome.setBreadcrumbs(emptyLastBreadcrumbUrl(breadcrumbs));
    }
  });
};

export const emptyLastBreadcrumbUrl = (breadcrumbs: ChromeBreadcrumb[]) => {
  const lastBreadcrumb = breadcrumbs[breadcrumbs.length - 1];
  if (lastBreadcrumb) {
    return [...breadcrumbs.slice(0, -1), { ...lastBreadcrumb, href: '', onClick: undefined }];
  }
  return breadcrumbs;
};
