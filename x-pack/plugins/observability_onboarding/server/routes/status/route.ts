/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';

const statusRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/get_status',
  options: {
    tags: [],
  },
  async handler(resources): Promise<{ status: 'incomplete' | 'complete' }> {
    return { status: 'complete' };
  },
});

export const statusRouteRepository = {
  ...statusRoute,
};
