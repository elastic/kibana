/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpResources } from 'src/core/server';

export interface ViewRouteDeps {
  httpResources: HttpResources;
}

export function initSpacesViewsRoutes(deps: ViewRouteDeps) {
  deps.httpResources.register(
    { path: '/spaces/space_selector', validate: false },
    (context, request, response) => response.renderCoreApp()
  );
}
