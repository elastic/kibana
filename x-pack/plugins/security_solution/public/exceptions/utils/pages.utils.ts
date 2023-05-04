/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ChromeBreadcrumb } from '@kbn/core/public';
import { EXCEPTIONS_PATH } from '../../../common/constants';
import type { GetSecuritySolutionUrl } from '../../common/components/link_to';
import type { RouteSpyState } from '../../common/utils/route/types';

const isListDetailPage = (pathname: string) =>
  pathname.includes(EXCEPTIONS_PATH) && pathname.includes('/details');

export const getTrailingBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  let breadcrumb: ChromeBreadcrumb[] = [];

  if (isListDetailPage(params.pathName) && params.state?.listName) {
    breadcrumb = [
      ...breadcrumb,
      {
        text: params.state.listName,
      },
    ];
  }
  return breadcrumb;
};
