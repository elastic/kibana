/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IRouter } from 'src/core/server';
import { ENROLLMENT_API_KEY_ROUTES, PLUGIN_ID } from '../../constants';
import {
  DeleteEnrollmentAPIKeyRequestSchema,
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types';
import {
  deleteEnrollmentApiKeyHandler,
  getEnrollmentApiKeysHandler,
  getOneEnrollmentApiKeyHandler,
  postEnrollmentApiKeyHandler,
} from './handler';

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN,
      validate: GetOneEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getOneEnrollmentApiKeyHandler
  );

  router.delete(
    {
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN,
      validate: DeleteEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    deleteEnrollmentApiKeyHandler
  );

  router.get(
    {
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
      validate: GetEnrollmentAPIKeysRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-read`] },
    },
    getEnrollmentApiKeysHandler
  );

  router.post(
    {
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
      validate: PostEnrollmentAPIKeyRequestSchema,
      options: { tags: [`access:${PLUGIN_ID}-all`] },
    },
    postEnrollmentApiKeyHandler
  );
};
