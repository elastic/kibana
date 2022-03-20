/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IRouter } from '../../../../../src/core/server';
import { registerProcessEventsRoute } from './process_events_route';
import { sessionEntryLeadersRoute } from './session_entry_leaders_route';

export const registerRoutes = (router: IRouter) => {
  registerProcessEventsRoute(router);
  sessionEntryLeadersRoute(router);
};
