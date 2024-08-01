/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../..';
import { ApiActionPermission } from '../../../../common/constants';
import { wrapIntoCustomErrorResponse } from '../../../errors';
import { createLicensedRouteHandler } from '../../licensed_route_handler';

export function defineSimplePrivilegesExampleRoutes({ router }: RouteDefinitionParams) {
  /**
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/authz_disabled
   */
  router.get(
    {
      path: '/api/security/authz_poc/authz_disabled',
      authz: {
        enabled: false,
        reason: 'This route is opted out from authorization for demo purposes',
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({
          body: {
            authzResult: request.authzResult,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
  /**
   * Requires both ManageSpaces AND TaskManager privileges.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/simple_privileges_example_1
   */
  router.get(
    {
      path: '/api/security/authz_poc/simple_privileges_example_1',
      authz: {
        requiredPrivileges: [ApiActionPermission.ManageSpaces, ApiActionPermission.TaskManager],
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({
          body: {
            authzResult: request.authzResult,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
  /**
   * Requires ManageSpaces AND ANY of (TaskManager OR Features) privileges.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/simple_privileges_example_2
   */
  router.get(
    {
      path: '/api/security/authz_poc/simple_privileges_example_2',
      authz: {
        requiredPrivileges: [
          ApiActionPermission.ManageSpaces,
          {
            anyRequired: [ApiActionPermission.TaskManager, ApiActionPermission.Features],
          },
        ],
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({
          body: {
            authzResult: request.authzResult,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
  /**
   * Requires ANY of (TaskManager OR Features) privileges.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/simple_privileges_example_3
   */
  router.get(
    {
      path: '/api/security/authz_poc/simple_privileges_example_3',
      authz: {
        requiredPrivileges: [
          {
            anyRequired: [ApiActionPermission.TaskManager, ApiActionPermission.Features],
          },
        ],
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        return response.ok({
          body: {
            authzResult: request.authzResult,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
