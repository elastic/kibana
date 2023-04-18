/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

const helloWorldRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability/onboarding/hello_world',
  options: {
    tags: [],
  },
  async handler(resources): Promise<{ message: string }> {
    return { message: 'Hello world!' };
  },
});

export const helloWorldRouteRepository = {
  ...helloWorldRoute,
};
