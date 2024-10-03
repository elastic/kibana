/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

import type { FleetAuthzRouter } from '../../services/security';

import { ENROLLMENT_API_KEY_ROUTES } from '../../constants';
import { API_VERSIONS } from '../../../common/constants';

import {
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
  EnrollmentAPIKeySchema,
  EnrollmentAPIKeyResponseSchema,
  DeleteEnrollmentAPIKeyResponseSchema,
} from '../../types';

import { genericErrorResponse } from '../schema/errors';

import { ListResponseSchema } from '../schema/utils';

import {
  getEnrollmentApiKeysHandler,
  getOneEnrollmentApiKeyHandler,
  deleteEnrollmentApiKeyHandler,
  postEnrollmentApiKeyHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
      description: `Get enrollment API key by ID`,
      options: {
        tags: ['oas_tag:Fleet enrollment API keys'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneEnrollmentAPIKeyRequestSchema,
          response: {
            200: {
              body: () => EnrollmentAPIKeyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOneEnrollmentApiKeyHandler
    );

  router.versioned
    .delete({
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
      description: `Revoke enrollment API key by ID by marking it as inactive`,
      options: {
        tags: ['oas_tag:Fleet enrollment API keys'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteEnrollmentAPIKeyRequestSchema,
          response: {
            200: {
              body: () => DeleteEnrollmentAPIKeyResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteEnrollmentApiKeyHandler
    );

  router.versioned
    .get({
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
      description: `List enrollment API keys`,
      options: {
        tags: ['oas_tag:Fleet enrollment API keys'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetEnrollmentAPIKeysRequestSchema,
          response: {
            200: {
              body: () =>
                ListResponseSchema(EnrollmentAPIKeySchema).extends({
                  list: schema.arrayOf(EnrollmentAPIKeySchema, { meta: { deprecated: true } }),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getEnrollmentApiKeysHandler
    );

  router.versioned
    .post({
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
      description: `Create enrollment API key`,
      options: {
        tags: ['oas_tag:Fleet enrollment API keys'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostEnrollmentAPIKeyRequestSchema,
          response: {
            200: {
              body: () =>
                EnrollmentAPIKeyResponseSchema.extends({
                  action: schema.literal('created'),
                }),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      postEnrollmentApiKeyHandler
    );

  router.versioned
    .get({
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneEnrollmentAPIKeyRequestSchema },
      },
      getOneEnrollmentApiKeyHandler
    );

  router.versioned
    .delete({
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteEnrollmentAPIKeyRequestSchema },
      },
      deleteEnrollmentApiKeyHandler
    );

  router.versioned
    .get({
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetEnrollmentAPIKeysRequestSchema },
      },
      getEnrollmentApiKeysHandler
    );

  router.versioned
    .post({
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { allAgents: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostEnrollmentAPIKeyRequestSchema },
      },
      postEnrollmentApiKeyHandler
    );
};
