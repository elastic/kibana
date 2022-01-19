/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from '../../../../../src/core/server';
import { registerTestRoute } from './test_route';
import { registerTestSavedObjectsRoute } from './test_saved_objects_route';
import { registerProcessEventsRoute } from './process_events_route';
import { registerRecentSessionRoute } from './recent_session_route';
import { sessionEntryLeadersRoute } from './session_entry_leaders_route';
import type { Logger } from 'kibana/server';

export const registerRoutes = (router: IRouter, logger: Logger) => {
  registerTestRoute(router);
  registerTestSavedObjectsRoute(router);
  registerProcessEventsRoute(router, logger);
  registerRecentSessionRoute(router);
  sessionEntryLeadersRoute(router);
};
