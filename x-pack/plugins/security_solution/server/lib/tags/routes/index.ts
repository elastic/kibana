/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SetupPlugins } from '../../../plugin_contract';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { createTagRoute } from './create_tag';
import { getTagsByNameRoute } from './get_tags_by_name';

export const registerTagsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger,
  security: SetupPlugins['security']
) => {
  getTagsByNameRoute(router, logger, security);
  createTagRoute(router, logger, security);
};
