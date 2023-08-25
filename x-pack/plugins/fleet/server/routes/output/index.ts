/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { OLDEST_PUBLIC_VERSION } from '../../../common/constants';

import { OUTPUT_API_ROUTES } from '../../constants';
import {
  DeleteOutputRequestSchema,
  GetOneOutputRequestSchema,
  GetOutputsRequestSchema,
  PostOutputRequestSchema,
  PutOutputRequestSchema,
} from '../../types';

import {
  deleteOutputHandler,
  getOneOuputHandler,
  getOutputsHandler,
  postOutputHandler,
  putOutputHandler,
  postLogstashApiKeyHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: { request: GetOutputsRequestSchema },
      },
      getOutputsHandler
    );
  router.versioned
    .get({
      path: OUTPUT_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: { request: GetOneOutputRequestSchema },
      },
      getOneOuputHandler
    );
  router.versioned
    .put({
      path: OUTPUT_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: { request: PutOutputRequestSchema },
      },
      putOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: { request: PostOutputRequestSchema },
      },
      postOutputHandler
    );

  router.versioned
    .delete({
      path: OUTPUT_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: { request: DeleteOutputRequestSchema },
      },
      deleteOutputHandler
    );

  router.versioned
    .post({
      path: OUTPUT_API_ROUTES.LOGSTASH_API_KEY_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
    })
    .addVersion(
      {
        version: OLDEST_PUBLIC_VERSION,
        validate: false,
      },
      postLogstashApiKeyHandler
    );
};
