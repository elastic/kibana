/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GetTrailingBreadcrumbs } from '../common/components/navigation/breadcrumbs/types';

/**
 * This module should only export this function.
 * All the `getTrailingBreadcrumbs` functions in Security are loaded into the main bundle.
 * We should be careful to not import unnecessary modules in this file to avoid increasing the main app bundle size.
 */
export const getTrailingBreadcrumbs: GetTrailingBreadcrumbs = (params, getSecuritySolutionUrl) => {
  const breadcrumbs = [];

  if (params.state?.ruleName) {
    breadcrumbs.push({
      text: params.state.ruleName,
    });
  }

  return breadcrumbs;
};
