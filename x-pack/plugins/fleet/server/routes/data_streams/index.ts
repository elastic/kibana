/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_STREAM_API_ROUTES } from '../../constants';
import type { FleetAuthzRouter } from '../security';

import { getListHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List of data streams
  router.get(
    {
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getListHandler
  );
};
