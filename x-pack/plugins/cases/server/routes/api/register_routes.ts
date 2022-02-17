/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RouteRegistrar } from 'kibana/server';
import { CasesRequestHandlerContext } from '../../types';
import { deleteCaseRoute } from './cases/delete_cases';
import { RegisterRoutesDeps } from './types';
import { wrapError } from './utils';

const getRoutes = () => [deleteCaseRoute];

export const registerRoutes = (deps: RegisterRoutesDeps) => {
  const { router, logger, kibanaVersion } = deps;
  const routes = getRoutes();

  routes.forEach((route) => {
    const { method, options, handler } = route;

    (router[method] as RouteRegistrar<typeof method, CasesRequestHandlerContext>)(
      options,
      async (context, request, response) => {
        try {
          const res = await handler({ logger, context, request, response });
          return res;
        } catch (error) {
          logger.error(error.message);
          return response.customError(wrapError(error));
        }
      }
    );
  });
};
