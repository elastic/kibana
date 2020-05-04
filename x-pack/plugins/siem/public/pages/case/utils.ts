/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';

import { ChromeBreadcrumb } from 'src/core/public';

import { getCaseDetailsUrl, getCaseUrl, getCreateCaseUrl } from '../../components/link_to';
import { RouteSpyState } from '../../utils/route/types';
import * as i18n from './translations';

export const getBreadcrumbs = (params: RouteSpyState, search: string[]): ChromeBreadcrumb[] => {
  const queryParameters = !isEmpty(search[0]) ? search[0] : null;

  let breadcrumb = [
    {
      text: i18n.PAGE_TITLE,
      href: getCaseUrl(queryParameters),
    },
  ];
  if (params.detailName === 'create') {
    breadcrumb = [
      ...breadcrumb,
      {
        text: i18n.CREATE_BC_TITLE,
        href: getCreateCaseUrl(queryParameters),
      },
    ];
  } else if (params.detailName != null) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state?.caseTitle ?? '',
        href: getCaseDetailsUrl({ id: params.detailName, search: queryParameters }),
      },
    ];
  }
  return breadcrumb;
};
