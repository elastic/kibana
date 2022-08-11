/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, MockRouter } from '../../__mocks__';

import { registerAppSearchRoutes } from '.';

describe('registerAppSearchRoutes', () => {
  it('runs without errors', () => {
    const mockRouter = new MockRouter({} as any);
    registerAppSearchRoutes({ ...mockDependencies, router: mockRouter.router });
  });
});
