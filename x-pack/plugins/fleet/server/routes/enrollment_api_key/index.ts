/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PLUGIN_ID, ENROLLMENT_API_KEY_ROUTES } from '../../constants';
import {
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types';
import type { FleetRouter } from '../../types/request_context';

import {
  getEnrollmentApiKeysHandler,
  getOneEnrollmentApiKeyHandler,
  deleteEnrollmentApiKeyHandler,
  postEnrollmentApiKeyHandler,
} from './handler';

export const registerRoutes = (routers: { superuser: FleetRouter; fleetSetup: FleetRouter }) => {
  routers.fleetSetup.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN,
      validate: GetOneEnrollmentAPIKeyRequestSchema,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      // options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneEnrollmentApiKeyHandler
  );

  routers.superuser.delete(
    {
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN,
      validate: DeleteEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteEnrollmentApiKeyHandler
  );

  routers.fleetSetup.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
      validate: GetEnrollmentAPIKeysRequestSchema,
      // Disable this tag and the automatic RBAC support until elastic/fleet-server access is removed in 8.0
      // Required to allow elastic/fleet-server to access this API.
      // options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getEnrollmentApiKeysHandler
  );

  routers.superuser.post(
    {
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
      validate: PostEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postEnrollmentApiKeyHandler
  );
};
