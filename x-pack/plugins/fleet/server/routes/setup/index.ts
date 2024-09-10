/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { AGENTS_SETUP_API_ROUTES, SETUP_API_ROUTE } from '../../constants';
import { API_VERSIONS } from '../../../common/constants';

import type { FleetConfigType } from '../../../common/types';

import { genericErrorResponse, internalErrorResponse } from '../schema/errors';

import { getFleetStatusHandler, fleetSetupHandler } from './handlers';

export const registerFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: SETUP_API_ROUTE,
      fleetAuthz: {
        fleet: { setup: true },
      },
      description: `Initiate Fleet setup`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          // operationId: 'setup',
          request: {},
          response: {
            200: {
              body: () =>
                schema.object(
                  {
                    isInitialized: schema.boolean(),
                    nonFatalErrors: schema.arrayOf(
                      schema.object({
                        name: schema.string(),
                        message: schema.string(),
                      })
                    ),
                  },
                  {
                    meta: {
                      description:
                        "A summary of the result of Fleet's `setup` lifecycle. If `isInitialized` is true, Fleet is ready to accept agent enrollment. `nonFatalErrors` may include useful insight into non-blocking issues with Fleet setup.",
                    },
                  }
                ),
            },
            400: {
              body: genericErrorResponse,
            },
            500: {
              body: internalErrorResponse,
            },
          },
        },
      },
      fleetSetupHandler
    );
};

// That route is used by agent to setup Fleet
export const registerCreateFleetSetupRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .post({
      path: AGENTS_SETUP_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { setup: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      fleetSetupHandler
    );
};

export const registerGetFleetStatusRoute = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: AGENTS_SETUP_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { setup: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      getFleetStatusHandler
    );
};

export const registerRoutes = (router: FleetAuthzRouter, config: FleetConfigType) => {
  // Ingest manager setup
  registerFleetSetupRoute(router);

  if (!config.agents.enabled) {
    return;
  }

  // Get Fleet setup
  registerGetFleetStatusRoute(router);

  // Create Fleet setup
  registerCreateFleetSetupRoute(router);
};
