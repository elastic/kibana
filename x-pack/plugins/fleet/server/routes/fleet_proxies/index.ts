/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FleetAuthzRouter } from '../../services/security';

import { FLEET_PROXY_API_ROUTES } from '../../../common/constants';
import {
  GetOneFleetProxyRequestSchema,
  PostFleetProxyRequestSchema,
  PutFleetProxyRequestSchema,
} from '../../types';

import {
  getAllFleetProxyHandler,
  postFleetProxyHandler,
  deleteFleetProxyHandler,
  getFleetProxyHandler,
  putFleetProxyHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: FLEET_PROXY_API_ROUTES.LIST_PATTERN,
      validate: false,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAllFleetProxyHandler
  );

  router.post(
    {
      path: FLEET_PROXY_API_ROUTES.CREATE_PATTERN,
      validate: PostFleetProxyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postFleetProxyHandler
  );

  router.put(
    {
      path: FLEET_PROXY_API_ROUTES.UPDATE_PATTERN,
      validate: PutFleetProxyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    putFleetProxyHandler
  );

  router.get(
    {
      path: FLEET_PROXY_API_ROUTES.DELETE_PATTERN,
      validate: GetOneFleetProxyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getFleetProxyHandler
  );

  router.delete(
    {
      path: FLEET_PROXY_API_ROUTES.DELETE_PATTERN,
      validate: GetOneFleetProxyRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteFleetProxyHandler
  );
};
