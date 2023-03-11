/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

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
  router.get(
    {
      path: DOWNLOAD_SOURCE_API_ROUTES.LIST_PATTERN,
      validate: getDownloadSourcesRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getDownloadSourcesHandler
  );
  router.get(
    {
      path: DOWNLOAD_SOURCE_API_ROUTES.INFO_PATTERN,
      validate: GetOneDownloadSourcesRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getOneDownloadSourcesHandler
  );
  router.put(
    {
      path: DOWNLOAD_SOURCE_API_ROUTES.UPDATE_PATTERN,
      validate: PutDownloadSourcesRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    putDownloadSourcesHandler
  );

  router.post(
    {
      path: DOWNLOAD_SOURCE_API_ROUTES.CREATE_PATTERN,
      validate: PostDownloadSourcesRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postDownloadSourcesHandler
  );

  router.delete(
    {
      path: DOWNLOAD_SOURCE_API_ROUTES.DELETE_PATTERN,
      validate: DeleteDownloadSourcesRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteDownloadSourcesHandler
  );
};
