/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import type { GetSecuritySolutionUrl } from '../common/components/link_to';
import type { RouteSpyState } from '../common/utils/route/types';

export const getTrailingBreadcrumbs = (
  params: RouteSpyState,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
): ChromeBreadcrumb[] => {
  const breadcrumbs = [];

  if (params.state?.ruleName) {
    breadcrumbs.push({
      text: params.state.ruleName,
    });
  }

  return breadcrumbs;
};
