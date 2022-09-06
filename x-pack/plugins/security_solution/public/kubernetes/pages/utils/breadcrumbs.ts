/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ChromeBreadcrumb } from '@kbn/core/public';
import { RouteSpyState } from '../../../common/utils/route/types';
import { SecurityPageName } from '../../../app/types';
import {
  getKubernetesDetailsUrl,
  GetSecuritySolutionUrl,
} from '../../../common/components/link_to';

export const getTrailingBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName != null) {
    breadcrumb = [
      {
        text: params.detailName,
        href: getSecuritySolutionUrl({
          path: getKubernetesDetailsUrl(params.detailName, ''),
          deepLinkId: SecurityPageName.kubernetes,
        }),
      },
    ];
  }

  return breadcrumb;
};
