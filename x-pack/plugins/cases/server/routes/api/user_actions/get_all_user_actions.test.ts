/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getUserActionsRoute } from './get_all_user_actions';

describe('getUserActionsRoute', () => {
  it('marks the endpoint internal in serverless', async () => {
    const router = getUserActionsRoute({ isServerless: true });

    expect(router.routerOptions?.access).toBe('internal');
  });

  it('marks the endpoint public in non-serverless', async () => {
    const router = getUserActionsRoute({ isServerless: false });

    expect(router.routerOptions?.access).toBe('public');
  });
});
