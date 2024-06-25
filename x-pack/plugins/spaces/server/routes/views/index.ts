/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { HttpResources, IBasePath, Logger } from '@kbn/core/server';
import { parseNextURL } from '@kbn/std';

import { ENTER_SPACE_PATH } from '../../../common';
import { wrapError } from '../../lib/errors';

export interface ViewRouteDeps {
  httpResources: HttpResources;
  basePath: IBasePath;
  logger: Logger;
}

export function initSpacesViewsRoutes(deps: ViewRouteDeps) {
  deps.httpResources.register(
    { path: '/spaces/space_selector', validate: false },
    (context, request, response) => response.renderCoreApp()
  );

  deps.httpResources.register(
    {
      path: ENTER_SPACE_PATH,
      validate: {
        query: schema.maybe(
          schema.object({ next: schema.maybe(schema.string()) }, { unknowns: 'ignore' })
        ),
      },
    },
    async (context, request, response) => {
      try {
        const { uiSettings } = await context.core;
        const defaultRoute = await uiSettings.client.get<string>('defaultRoute');
        const basePath = deps.basePath.get(request);
        const nextCandidateRoute = parseNextURL(request.url.href);

        const route = nextCandidateRoute === '/' ? defaultRoute : nextCandidateRoute;
        // need to get reed of ../../ to make sure we will not be out of space basePath
        const normalizedRoute = new URL(route, 'https://localhost');

        return response.redirected({
          headers: {
            location: `${basePath}${normalizedRoute.pathname}${normalizedRoute.search}`,
          },
        });
      } catch (e) {
        deps.logger.error(`Error navigating to space: ${e}`);
        return response.customError(wrapError(e));
      }
    }
  );
}
