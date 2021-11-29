/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';
import { wrapIntoCustomErrorResponse } from '../../errors';
import { createLicensedRouteHandler } from '../licensed_route_handler';

const COUNTER_TYPE = 'SecurityAuthType';

export function defineTelemetryOnAuthTypeRoutes({
  getAuthenticationService,
  router,
  usageCounter,
}: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/security/telemetry/auth_type',
      validate: {
        body: schema.nullable(
          schema.object({
            auth_type: schema.string(),
            timestamp: schema.number(),
            username_hash: schema.string(),
          })
        ),
      },
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        let timestamp = new Date().getTime();
        const {
          auth_type: oldAuthType,
          username_hash: oldUsernameHash,
          timestamp: oldTimestamp,
        } = request.body || {
          auth_type: '',
          username_hash: '',
          timestamp,
        };
        const authUser = await getAuthenticationService().getCurrentUser(request);
        const usernameHash = authUser
          ? createHash('sha3-256').update(authUser?.username).digest('hex')
          : '';

        const elapsedTimeInHrs = (timestamp - oldTimestamp) / (1000 * 60 * 60);

        if (
          !authUser?.authentication_type ||
          (authUser?.authentication_type && authUser?.authentication_type === '')
        ) {
          return response.badRequest({
            body: { message: `Authentication type can not be empty` },
          });
        }

        if (
          usageCounter &&
          (elapsedTimeInHrs >= 12 ||
            oldUsernameHash !== usernameHash ||
            oldAuthType !== authUser?.authentication_type)
        ) {
          usageCounter.incrementCounter({
            counterName: authUser?.authentication_type,
            counterType: COUNTER_TYPE,
            incrementBy: 1,
          });
        } else {
          timestamp = oldTimestamp;
        }

        return response.ok({
          body: {
            auth_type: authUser?.authentication_type,
            username_hash: usernameHash,
            timestamp,
          },
        });
      } catch (error) {
        return response.customError(wrapIntoCustomErrorResponse(error));
      }
    })
  );
}
