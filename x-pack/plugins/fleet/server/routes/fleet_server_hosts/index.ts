/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FleetAuthzRouter } from '../../services/security';

import { FLEET_SERVER_HOST_API_ROUTES } from '../../../common/constants';
import {
  GetAllFleetServerHostRequestSchema,
  GetOneFleetServerHostRequestSchema,
  PostFleetServerHostRequestSchema,
  PutFleetServerHostRequestSchema,
} from '../../types';

import {
  deleteFleetServerHostHandler,
  getAllFleetServerHostsHandler,
  getFleetServerHostHandler,
  postFleetServerHost,
  putFleetServerHostHandler,
} from './handler';

export const registerRoutes = (router: FleetAuthzRouter) => {
  router.get(
    {
      path: FLEET_SERVER_HOST_API_ROUTES.LIST_PATTERN,
      validate: GetAllFleetServerHostRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getAllFleetServerHostsHandler
  );
  router.post(
    {
      path: FLEET_SERVER_HOST_API_ROUTES.CREATE_PATTERN,
      validate: PostFleetServerHostRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    postFleetServerHost
  );
  router.get(
    {
      path: FLEET_SERVER_HOST_API_ROUTES.INFO_PATTERN,
      validate: GetOneFleetServerHostRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    getFleetServerHostHandler
  );
  router.delete(
    {
      path: FLEET_SERVER_HOST_API_ROUTES.DELETE_PATTERN,
      validate: GetOneFleetServerHostRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    deleteFleetServerHostHandler
  );
  router.put(
    {
      path: FLEET_SERVER_HOST_API_ROUTES.UPDATE_PATTERN,
      validate: PutFleetServerHostRequestSchema,
      fleetAuthz: {
        fleet: { all: true },
      },
    },
    putFleetServerHostHandler
  );
};
