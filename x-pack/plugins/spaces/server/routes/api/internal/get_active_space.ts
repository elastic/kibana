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
  const { internalRouter, getSpacesService } = deps;

  internalRouter.get(
    {
      path: '/internal/spaces/_active_space',
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
