/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENROLLMENT_API_KEY_ROUTES } from '../../constants';
import {
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types';
import type { FleetAuthzRouter } from '../security';

import {
  getEnrollmentApiKeysHandler,
  getOneEnrollmentApiKeyHandler,
  deleteEnrollmentApiKeyHandler,
  postEnrollmentApiKeyHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN,
      validate: GetOneEnrollmentAPIKeyRequestSchema,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
    },
    getOneEnrollmentApiKeyHandler
  );

  router.delete(
    {
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN,
      validate: DeleteEnrollmentAPIKeyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteEnrollmentApiKeyHandler
  );

  router.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
      validate: GetEnrollmentAPIKeysRequestSchema,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
    },
    getEnrollmentApiKeysHandler
  );

  router.post(
    {
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
      validate: PostEnrollmentAPIKeyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postEnrollmentApiKeyHandler
  );

  routers.fleetSetup.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN_DEPRECATED,
      validate: GetOneEnrollmentAPIKeyRequestSchema,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      // options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneEnrollmentApiKeyHandler
  );

  routers.superuser.delete(
    {
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN_DEPRECATED,
      validate: DeleteEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteEnrollmentApiKeyHandler
  );

  routers.fleetSetup.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN_DEPRECATED,
      validate: GetEnrollmentAPIKeysRequestSchema,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      // options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getEnrollmentApiKeysHandler
  );

  routers.superuser.post(
    {
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN_DEPRECATED,
      validate: PostEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postEnrollmentApiKeyHandler
  );
};
