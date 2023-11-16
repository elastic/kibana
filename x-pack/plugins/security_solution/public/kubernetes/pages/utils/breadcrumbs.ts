/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import { SecurityPageName } from '../../../app/types';
import { getKubernetesDetailsUrl } from '../../../common/components/link_to';
import type { GetTrailingBreadcrumbs } from '../../../common/components/navigation/breadcrumbs/types';

/**
 * This module should only export this function.
 * All the `getTrailingBreadcrumbs` functions in Security are loaded into the main bundle.
 * We should be careful to not import unnecessary modules in this file to avoid increasing the main app bundle size.
 */
export const getTrailingBreadcrumbs: GetTrailingBreadcrumbs = (params, getSecuritySolutionUrl) => {
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
