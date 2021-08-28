/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { IRouter } from '../../../../../../src/core/server/http/router/router';
import { PLUGIN_ID } from '../../../common/constants/plugin';
import { ENROLLMENT_API_KEY_ROUTES } from '../../../common/constants/routes';
import {
  DeleteEnrollmentAPIKeyRequestSchema,
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types/rest_spec/enrollment_api_key';

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
