/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { isEmpty } from 'lodash/fp';
import type { RouteSpyState } from '../../common/utils/route/types';

export const getTrailingBreadcrumbs = (params: RouteSpyState): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  const dashboardTitle = params?.state?.dashboardTitle?.trim();
  if (params?.state?.dashboardTitle || params.detailName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: !isEmpty(dashboardTitle) ? dashboardTitle : params.detailName,
      },
    ];
  }

  return breadcrumb;
};
