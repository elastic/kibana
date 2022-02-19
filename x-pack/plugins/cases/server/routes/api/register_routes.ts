/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { pick } from 'lodash';
import { RouteRegistrar } from 'kibana/server';
import { CasesRequestHandlerContext } from '../../types';
import { CaseRoute, RegisterRoutesDeps } from './types';
import { escapeHatch, wrapError } from './utils';

export function pickKeys<T, K extends keyof T>(obj: T, ...keys: K[]) {
  return pick(obj, keys) as Pick<T, K>;
}

export const registerRoutes = (deps: RegisterRoutesDeps) => {
  const { router, routes, logger, kibanaVersion } = deps;

  routes.forEach((route) => {
    const { method, path, params, handler } = route as CaseRoute;

    (router[method] as RouteRegistrar<typeof method, CasesRequestHandlerContext>)(
      {
        path,
        validate: {
          params: params.params ?? escapeHatch,
          query: params.query ?? escapeHatch,
          body: params.body ?? schema.nullable(escapeHatch),
        },
      },
      async (context, request, response) => {
        try {
          const res = await handler({ logger, context, request, response, kibanaVersion });
          return res;
        } catch (error) {
          logger.error(error.message);
          return response.customError(wrapError(error));
        }
      }
    );
  });
};
