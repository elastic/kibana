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

export function defineOfferingPrivilegesExampleRoutes({ router }: RouteDefinitionParams) {
  /**
   * Requires both ManageSpaces AND TaskManager privileges for serverless.
   * Requires only TaskManager privilege for traditional.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/offering_privileges_example_1
   */
  router.get(
    {
      path: '/api/security/authz_poc/offering_privileges_example_1',
      security: {
        authz: {
          requiredPrivileges: [
            {
              offering: 'serverless',
              allRequired: [ApiActionPermission.ManageSpaces, ApiActionPermission.TaskManager],
            },
            {
              offering: 'traditional',
              allRequired: [ApiActionPermission.TaskManager],
            },
          ],
        },
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
   * Requires both ManageSpaces AND TaskManager AND ANY of (Features OR DecryptedTelemetry) privileges for serverless.
   * Requires ANY TaskManager OR ManageSpaces privilege for traditional.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/offering_privileges_example_2
   */
  router.get(
    {
      path: '/api/security/authz_poc/offering_privileges_example_2',
      security: {
        authz: {
          requiredPrivileges: [
            {
              offering: 'serverless',
              allRequired: [ApiActionPermission.ManageSpaces, ApiActionPermission.TaskManager],
              anyRequired: [ApiActionPermission.Features, ApiActionPermission.DecryptedTelemetry],
            },
            {
              offering: 'traditional',
              anyRequired: [ApiActionPermission.TaskManager, ApiActionPermission.ManageSpaces],
            },
          ],
        },
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
   * Requires TaskManager AND ANY of (Features OR DecryptedTelemetry) privileges for serverless.
   * Requires only TaskManager privilege for traditional.
   *
   * Check OAS authz description generated
   * GET /api/oas?pathStartsWith=/api/security/authz_poc/offering_privileges_example_3
   */
  router.get(
    {
      path: '/api/security/authz_poc/offering_privileges_example_3',
      security: {
        authz: {
          requiredPrivileges: [
            ApiActionPermission.TaskManager,
            {
              offering: 'serverless',
              anyRequired: [ApiActionPermission.Features, ApiActionPermission.DecryptedTelemetry],
            },
          ],
        },
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
