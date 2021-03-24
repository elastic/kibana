/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteDefinitionParams } from '../';

/**
 * Defines routes required for the Unauthorized view.
 */
export function defineUnauthorizedRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/security/unauthorized',
      validate: false,
      options: { authRequired: false },
    },
    (context, request, response) => response.renderAnonymousCoreApp()
  );
}
