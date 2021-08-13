/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockDependencies, MockRouter } from '../../../__mocks__';

import { registerCrawlerRoutes } from '.';

describe('registerCrawlerRoutes', () => {
  it('runs without throwing an error', () => {
    expect(
      registerCrawlerRoutes({
        ...mockDependencies,
        router: new MockRouter({
          method: 'get',
          path: '/foo',
        }).router,
      })
    ).toBeUndefined();
  });
});
