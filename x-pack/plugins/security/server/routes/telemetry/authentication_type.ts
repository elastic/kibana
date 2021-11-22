/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const COUNTER_TYPE = 'SecurityAuthType';

export function defineTelemetryOnAuthTypeRoutes({ router, usageCounter }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/telemetry/auth_type',
      validate: {
        body: schema.object({
          auth_type: schema.string(),
        }),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const { auth_type: authType } = request.body;

        if (!authType || (authType && authType === '')) {
          return response.badRequest({
            body: { message: `Authentication type attribute can not be empty` },
          });
        }

        if (usageCounter) {
          usageCounter.incrementCounter({
            counterName: authType,
            counterType: COUNTER_TYPE,
            incrementBy: 1,
          });
        }

        return response.noContent();
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
