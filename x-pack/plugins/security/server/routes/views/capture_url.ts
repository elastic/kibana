/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { RouteDefinitionParams } from '..';

/**
 * Defines routes required for the Capture URL view.
 */
export function defineCaptureURLRoutes({ httpResources }: RouteDefinitionParams) {
  httpResources.register(
    {
      path: '/internal/security/capture-url',
      validate: {
        query: schema.object({
          providerType: schema.string({ minLength: 1 }),
          providerName: schema.string({ minLength: 1 }),
          next: schema.maybe(schema.string()),
        }),
      },
      options: { authRequired: false },
    },
    (context, request, response) => response.renderAnonymousCoreApp()
  );
}
