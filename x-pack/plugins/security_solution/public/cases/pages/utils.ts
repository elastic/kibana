/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from 'src/core/public';

import { getCaseDetailsUrl, getCreateCaseUrl } from '../../common/components/link_to';
import { RouteSpyState } from '../../common/utils/route/types';
import * as i18n from './translations';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { APP_ID } from '../../../common/constants';
import { SecurityPageName } from '../../app/types';

export const getBreadcrumbs = (
  params: RouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] => {
  const queryParameters = !isEmpty(search[0]) ? search[0] : '';

  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getUrlForApp(APP_ID, {
        deepLinkId: SecurityPageName.case,
        path: queryParameters,
      }),
    },
  ];
  if (params.pathName === '/create') {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18n.CREATE_BC_TITLE,
        href: getUrlForApp(APP_ID, {
          deepLinkId: SecurityPageName.case,
          path: getCreateCaseUrl(queryParameters),
        }),
      },
    ];
  } else if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state?.caseTitle ?? '',
        href: getUrlForApp(APP_ID, {
          deepLinkId: SecurityPageName.case,
          path: getCaseDetailsUrl({ id: params.detailName, search: queryParameters }),
        }),
      },
    ];
  }
  return breadcrumb;
};
