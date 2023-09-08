/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { ENROLLMENT_API_KEY_ROUTES } from '../../constants';
import { API_VERSIONS, INTERNAL_API_ACCESS } from '../../../common/constants';

import {
  GetEnrollmentAPIKeysRequestSchema,
  GetOneEnrollmentAPIKeyRequestSchema,
  DeleteEnrollmentAPIKeyRequestSchema,
  PostEnrollmentAPIKeyRequestSchema,
} from '../../types';

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
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
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
      path: ENROLLMENT_API_KEY_ROUTES.LIST_PATTERN,
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
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostEnrollmentAPIKeyRequestSchema },
      },
      postEnrollmentApiKeyHandler
    );

  router.versioned
    .get({
      path: ENROLLMENT_API_KEY_ROUTES.INFO_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { readEnrollmentTokens: true },
      },
      access: INTERNAL_API_ACCESS,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: GetOneEnrollmentAPIKeyRequestSchema },
      },
      getOneEnrollmentApiKeyHandler
    );

  router.versioned
    .delete({
      path: ENROLLMENT_API_KEY_ROUTES.DELETE_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { all: true },
      },
      access: INTERNAL_API_ACCESS,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
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
      access: INTERNAL_API_ACCESS,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: GetEnrollmentAPIKeysRequestSchema },
      },
      getEnrollmentApiKeysHandler
    );

  router.versioned
    .post({
      path: ENROLLMENT_API_KEY_ROUTES.CREATE_PATTERN_DEPRECATED,
      fleetAuthz: {
        fleet: { all: true },
      },
      access: INTERNAL_API_ACCESS,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: { request: PostEnrollmentAPIKeyRequestSchema },
      },
      postEnrollmentApiKeyHandler
    );
};
