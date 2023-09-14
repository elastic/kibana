/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { createProjectNavLinks$ } from '../../navigation/links/nav_links';
import type { SecuritySolutionServerlessPluginStartDeps } from '../../types';
import type { Services } from './types';

/**
 * Creates the services for the plugin components to consume.
 * It should be created only once and stored in the ServicesProvider for general access
 * */
export const createServices = (
  core: CoreStart,
  pluginsStart: SecuritySolutionServerlessPluginStartDeps
): Services => {
  const { securitySolution, cloud } = pluginsStart;
  const projectNavLinks$ = createProjectNavLinks$(securitySolution.getNavLinks$(), core, cloud);
  return { ...core, ...pluginsStart, getProjectNavLinks$: () => projectNavLinks$ };
};
