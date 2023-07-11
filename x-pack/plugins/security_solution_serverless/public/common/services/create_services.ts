/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { getProjectNavLinks$ } from '../../navigation/links/nav_links';
import type { SecuritySolutionServerlessPluginStartDeps } from '../../types';
import type { Services } from './types';

export const createServices = (
  core: CoreStart,
  pluginsStart: SecuritySolutionServerlessPluginStartDeps
): Services => {
  const { securitySolution } = pluginsStart;
  const projectNavLinks$ = getProjectNavLinks$(securitySolution.getNavLinks$(), core);
  return { ...core, ...pluginsStart, getProjectNavLinks$: () => projectNavLinks$ };
};
