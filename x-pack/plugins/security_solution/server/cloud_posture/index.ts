/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger } from 'src/core/server';
import * as routes from './routes';
import type { SecuritySolutionPluginRouter } from '../types';

export const createCSPRoutes = (router: SecuritySolutionPluginRouter, logger: Logger): void => {
  routes.createFindingsRoute(router, logger);
  routes.getScoreRoute(router, logger);
};


