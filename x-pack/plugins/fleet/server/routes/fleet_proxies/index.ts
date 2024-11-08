/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FleetAuthzRouter } from '../../services/security';
import { API_VERSIONS } from '../../../common/constants';

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
  router.versioned
    .get({
      path: FLEET_PROXY_API_ROUTES.LIST_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      summary: `Get proxies`,
      options: {
        tags: ['oas-tag:Fleet proxies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      getAllFleetProxyHandler
    );

  router.versioned
    .post({
      path: FLEET_PROXY_API_ROUTES.CREATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: `Create a proxy`,
      options: {
        tags: ['oas-tag:Fleet proxies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostFleetProxyRequestSchema },
      },
      postFleetProxyHandler
    );

  router.versioned
    .put({
      path: FLEET_PROXY_API_ROUTES.UPDATE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: `Update a proxy`,
      description: `Update a proxy by ID.`,
      options: {
        tags: ['oas-tag:Fleet proxies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PutFleetProxyRequestSchema },
      },
      putFleetProxyHandler
    );

  router.versioned
    .get({
      path: FLEET_PROXY_API_ROUTES.INFO_PATTERN,
      fleetAuthz: {
        fleet: { readSettings: true },
      },
      summary: `Get a proxy`,
      description: `Get a proxy by ID.`,
      options: {
        tags: ['oas-tag:Fleet proxies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneFleetProxyRequestSchema },
      },
      getFleetProxyHandler
    );

  router.versioned
    .delete({
      path: FLEET_PROXY_API_ROUTES.DELETE_PATTERN,
      fleetAuthz: {
        fleet: { allSettings: true },
      },
      summary: `Delete a proxy`,
      description: `Delete a proxy by ID`,
      options: {
        tags: ['oas-tag:Fleet proxies'],
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: GetOneFleetProxyRequestSchema },
      },
      deleteFleetProxyHandler
    );
};
