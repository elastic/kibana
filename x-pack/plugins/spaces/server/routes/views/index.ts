/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IRouter } from 'src/core/server';

export interface ViewRouteDeps {
  viewRouter: IRouter;
  cspHeader: string;
}

export function initSpacesViewsRoutes(deps: ViewRouteDeps) {
  deps.viewRouter.get(
    {
      path: '/spaces/space_selector',
      validate: false,
    },
    async (context, request, response) => {
      return response.ok({
        headers: {
          'Content-Security-Policy': deps.cspHeader,
        },
        body: await context.core.rendering.render({ includeUserSettings: true }),
      });
    }
  );
}
