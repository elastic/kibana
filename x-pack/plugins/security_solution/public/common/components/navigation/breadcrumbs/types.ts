/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChromeBreadcrumb } from '@kbn/core/public';
import type { RouteSpyState } from '../../../utils/route/types';
import type { GetSecuritySolutionUrl } from '../../link_to';

export type GetTrailingBreadcrumbs<T extends RouteSpyState = RouteSpyState> = (
  spyState: T,
  getSecuritySolutionUrl: GetSecuritySolutionUrl
) => ChromeBreadcrumb[];
