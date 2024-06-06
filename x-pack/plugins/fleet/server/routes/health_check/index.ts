/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import https from 'https';

import type { TypeOf } from '@kbn/config-schema';
import fetch from 'node-fetch';

import { API_VERSIONS } from '../../../common/constants';
import type { FleetAuthzRouter } from '../../services/security';

import { APP_API_ROUTES } from '../../constants';
import type { FleetRequestHandler } from '../../types';
import { defaultFleetErrorHandler } from '../../errors';
import { PostHealthCheckRequestSchema } from '../../types';

export const registerRoutes = (router: FleetAuthzRouter) => {
  // get fleet server health check by host
  router.versioned
    .post({
      path: APP_API_ROUTES.HEALTH_CHECK_PATTERN,
      fleetAuthz: {
        fleet: { all: true },
      },
      description: `Check Fleet Server health`,
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: { request: PostHealthCheckRequestSchema },
      },
      postHealthCheckHandler
    );
};

export const postHealthCheckHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostHealthCheckRequestSchema.body>
> = async (context, request, response) => {
  try {
    const abortController = new AbortController();
    const { host } = request.body;

    // Sometimes when the host is not online, the request hangs
    // Setting a timeout to abort the request after 5s
    setTimeout(() => {
      abortController.abort();
    }, 5000);

    const res = await fetch(`${host}/api/status`, {
      headers: {
        accept: '*/*',
      },
      method: 'GET',
      agent: new https.Agent({
        rejectUnauthorized: false,
      }),
      signal: abortController.signal,
    });
    const bodyRes = await res.json();
    const body = { ...bodyRes, host };

    return response.ok({ body });
  } catch (error) {
    // when the request is aborted, return offline status
    if (error.name === 'AbortError') {
      return response.ok({
        body: { name: 'fleet-server', status: `OFFLINE`, host: request.body.host },
      });
    }
    return defaultFleetErrorHandler({ error, response });
  }
};
