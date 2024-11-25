/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { DATA_STREAM_API_ROUTES } from '../../constants';

import { getListHandler } from './handlers';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // List of data streams
  router.versioned
    .get({
      path: DATA_STREAM_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
      summary: `Get data streams`,
      options: {
        tags: ['oas-tag:Data streams'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      getListHandler
    );
};
