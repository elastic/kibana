/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { GetTrailingBreadcrumbs } from '../../../../common/components/navigation/breadcrumbs/types';
import { getAlertDetailsUrl } from '../../../../common/components/link_to';
import { SecurityPageName } from '../../../../../common/constants';
import type { AlertDetailRouteSpyState } from '../../../../common/utils/route/types';
import { AlertDetailRouteType } from '../types';
import * as i18n from '../translations';

const TabNameMappedToI18nKey: Record<AlertDetailRouteType, string> = {
  [AlertDetailRouteType.summary]: i18n.SUMMARY_PAGE_TITLE,
};

/**
 * This module should only export this function.
 * All the `getTrailingBreadcrumbs` functions in Security are loaded into the main bundle.
 * We should be careful to not import unnecessary modules in this file to avoid increasing the main app bundle size.
 */
export const getTrailingBreadcrumbs: GetTrailingBreadcrumbs<AlertDetailRouteSpyState> = (
  params,
  getSecuritySolutionUrl
) => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state?.ruleName ?? params.detailName,
        href: getSecuritySolutionUrl({
          path: getAlertDetailsUrl(params.detailName, ''),
          deepLinkId: SecurityPageName.alerts,
        }),
      },
    ];
  }
  if (params.tabName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: TabNameMappedToI18nKey[params.tabName],
        href: '',
      },
    ];
  }
  return breadcrumb;
};
