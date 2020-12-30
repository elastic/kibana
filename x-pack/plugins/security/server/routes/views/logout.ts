/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Logout out view.
 */
export function defineLogoutRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    { path: '/logout', validate: false, options: { authRequired: false } },
    (context, request, response) => response.renderAnonymousCoreApp()
  );
}
