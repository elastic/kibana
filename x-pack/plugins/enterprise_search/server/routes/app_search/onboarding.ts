/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { RouteDependencies } from '../../plugin';

export function registerOnboardingRoutes({
  router,
  enterpriseSearchRequestHandler,
}: RouteDependencies) {
  router.post(
    {
      path: '/internal/app_search/onboarding_complete',
      validate: {
        body: schema.object({
          seed_sample_engine: schema.maybe(schema.boolean()),
        }),
      },
    },
    enterpriseSearchRequestHandler.createRequest({
      path: '/as/onboarding/complete',
      hasJsonResponse: false,
    })
  );
}
