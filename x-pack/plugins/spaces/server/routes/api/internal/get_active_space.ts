/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InternalRouteDeps } from '.';
import { wrapError } from '../../../lib/errors';
import { createLicensedRouteHandler } from '../../lib';

export function initGetActiveSpaceApi(deps: InternalRouteDeps) {
  const { router, getSpacesService } = deps;

  router.get(
    {
      path: '/internal/spaces/_active_space',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route delegates authorization to the spaces service getActiveSpace API, which uses a scoped spaces client',
        },
      },
      validate: false,
    },
    createLicensedRouteHandler(async (context, request, response) => {
      try {
        const space = await getSpacesService().getActiveSpace(request);
        return response.ok({ body: space });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    })
  );
}
