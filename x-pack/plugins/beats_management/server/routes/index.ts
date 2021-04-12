/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BeatsManagementRouter } from '../lib/types';
import {
  registerDeleteConfigurationBlocksRoute,
  registerGetConfigurationBlocksRoute,
  registerUpsertConfigurationBlocksRoute,
} from './configurations';
import { registerCreateTokenRoute } from './tokens';
import {
  registerSetTagRoute,
  registerListTagsRoute,
  registerGetTagsWithIdsRoute,
  registerDeleteTagsWithIdsRoute,
  registerAssignableTagsRoute,
} from './tags';
import {
  registerBeatUpdateRoute,
  registerTagRemovalsRoute,
  registerTagAssignmentsRoute,
  registerListAgentsRoute,
  registerGetBeatRoute,
  registerBeatEventsRoute,
  registerBeatEnrollmentRoute,
  registerGetBeatConfigurationRoute,
} from './beats';

export const registerRoutes = (router: BeatsManagementRouter) => {
  // configurations
  registerGetConfigurationBlocksRoute(router);
  registerDeleteConfigurationBlocksRoute(router);
  registerUpsertConfigurationBlocksRoute(router);
  // beats
  registerBeatUpdateRoute(router);
  registerTagRemovalsRoute(router);
  registerTagAssignmentsRoute(router);
  registerListAgentsRoute(router);
  registerGetBeatRoute(router);
  registerBeatEventsRoute(router);
  registerBeatEnrollmentRoute(router);
  registerGetBeatConfigurationRoute(router);
  // tags
  registerSetTagRoute(router);
  registerListTagsRoute(router);
  registerGetTagsWithIdsRoute(router);
  registerDeleteTagsWithIdsRoute(router);
  registerAssignableTagsRoute(router);
  // tokens
  registerCreateTokenRoute(router);
};
