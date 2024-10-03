/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FleetAuthzRouter } from '../../services/security';

import { API_VERSIONS } from '../../../common/constants';

import { DOWNLOAD_SOURCE_API_ROUTES } from '../../constants';
import {
  getDownloadSourcesRequestSchema,
  GetOneDownloadSourcesRequestSchema,
  PutDownloadSourcesRequestSchema,
  PostDownloadSourcesRequestSchema,
  DeleteDownloadSourcesRequestSchema,
  DownloadSourceResponseSchema,
  DeleteDownloadSourcesResponseSchema,
  GetDownloadSourceResponseSchema,
} from '../../types';

import { genericErrorResponse } from '../schema/errors';

import { ListResponseSchema } from '../schema/utils';

import {
  getDownloadSourcesHandler,
  getOneDownloadSourcesHandler,
  putDownloadSourcesHandler,
  postDownloadSourcesHandler,
  deleteDownloadSourcesHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.versioned
    .get({
      path: DOWNLOAD_SOURCE_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      description: `List agent binary download sources`,
      options: {
        tags: ['oas_tag:Elastic Agent binary download sources'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: getDownloadSourcesRequestSchema,
          response: {
            200: {
              body: () => ListResponseSchema(DownloadSourceResponseSchema),
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getDownloadSourcesHandler
    );

  router.versioned
    .get({
      path: DOWNLOAD_SOURCE_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      description: `Get agent binary download source by ID`,
      options: {
        tags: ['oas_tag:Elastic Agent binary download sources'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: GetOneDownloadSourcesRequestSchema,
          response: {
            200: {
              body: () => GetDownloadSourceResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      getOneDownloadSourcesHandler
    );

  router.versioned
    .put({
      path: DOWNLOAD_SOURCE_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      description: `Update agent binary download source by ID`,
      options: {
        tags: ['oas_tag:Elastic Agent binary download sources'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PutDownloadSourcesRequestSchema,
          response: {
            200: {
              body: () => GetDownloadSourceResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      putDownloadSourcesHandler
    );

  router.versioned
    .post({
      path: DOWNLOAD_SOURCE_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      description: `Create agent binary download source`,
      options: {
        tags: ['oas_tag:Elastic Agent binary download sources'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: PostDownloadSourcesRequestSchema,
          response: {
            200: {
              body: () => GetDownloadSourceResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      postDownloadSourcesHandler
    );

  router.versioned
    .delete({
      path: DOWNLOAD_SOURCE_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      description: `Delete agent binary download source by ID`,
      options: {
        tags: ['oas_tag:Elastic Agent binary download sources'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: {
          request: DeleteDownloadSourcesRequestSchema,
          response: {
            200: {
              body: () => DeleteDownloadSourcesResponseSchema,
            },
            400: {
              body: genericErrorResponse,
            },
          },
        },
      },
      deleteDownloadSourcesHandler
    );
};
