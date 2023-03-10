/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { GetSecuritySolutionUrl } from '../../common/components/link_to';
import { SecurityPageName } from '../../../common/constants';
import type { RouteSpyState } from '../../common/utils/route/types';
import { DASHBOARDS_PAGE_TITLE } from './translations';

export const getDashboardBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  breadcrumb = [
    ...breadcrumb,
    {
      text: DASHBOARDS_PAGE_TITLE,
      href: getSecuritySolutionUrl({
        deepLinkId: SecurityPageName.dashboardsLanding,
      }),
    },
  ];

  if (params?.state?.dashboardTitle || params.detailName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params?.state?.dashboardTitle ?? params.detailName,
      },
    ];
  }

  return breadcrumb;
};
