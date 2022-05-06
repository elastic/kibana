/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HINT_API_ROUTES } from '../../constants';
import { GetHintsRequestSchema } from '../../types';
import type { FleetConfigType } from '../..';
import type { FleetAuthzRouter } from '../security';

import { getHintsHandler } from './handlers';

export const registerAPIRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Get one
  router.get(
    {
      path: HINT_API_ROUTES.LIST_PATTERN,
      validate: GetHintsRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getHintsHandler
  );
};
