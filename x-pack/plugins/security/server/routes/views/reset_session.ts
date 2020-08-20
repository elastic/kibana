/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Reset Session view.
 */
export function defineResetSessionRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    { path: '/security/reset_session', validate: false },
    (context, req, res) => res.renderCoreApp()
  );
}
