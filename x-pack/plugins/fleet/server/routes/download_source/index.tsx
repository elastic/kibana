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
} from '../../types';

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
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: getDownloadSourcesRequestSchema },
      },
      getDownloadSourcesHandler
    );

  router.versioned
    .get({
      path: DOWNLOAD_SOURCE_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneDownloadSourcesRequestSchema },
      },
      getOneDownloadSourcesHandler
    );

  router.versioned
    .put({
      path: DOWNLOAD_SOURCE_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PutDownloadSourcesRequestSchema },
      },
      putDownloadSourcesHandler
    );

  router.versioned
    .post({
      path: DOWNLOAD_SOURCE_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostDownloadSourcesRequestSchema },
      },
      postDownloadSourcesHandler
    );

  router.versioned
    .delete({
      path: DOWNLOAD_SOURCE_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: DeleteDownloadSourcesRequestSchema },
      },
      deleteDownloadSourcesHandler
    );
};
