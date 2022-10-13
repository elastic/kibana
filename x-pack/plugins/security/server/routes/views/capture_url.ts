/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Capture URL view.
 */
export function defineCaptureURLRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/internal/security/capture-url',
      validate: {
        query: schema.object({ next: schema.maybe(schema.string()) }, { unknowns: 'ignore' }),
      },
      options: { authRequired: false },
    },
    (context, request, response) => response.renderAnonymousCoreApp()
  );
}
