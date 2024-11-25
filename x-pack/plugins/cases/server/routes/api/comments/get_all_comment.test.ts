/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAllCommentsRoute } from './get_all_comment';

describe('getAllCommentsRoute', () => {
  it('marks the endpoint internal in serverless', async () => {
    const router = getAllCommentsRoute({ isServerless: true });

    expect(router.routerOptions?.access).toBe('internal');
  });

  it('marks the endpoint public in non-serverless', async () => {
    const router = getAllCommentsRoute({ isServerless: false });

    expect(router.routerOptions?.access).toBe('public');
  });
});
