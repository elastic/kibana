/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/server/mocks';
import { registerRoutes } from '.';

describe('registerRoutes', () => {
  it('foo', () => {
    const router = httpServiceMock.createRouter();

    registerRoutes(router);

    expect(router.post).toHaveBeenCalledTimes(1);
    expect(router.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/global_search/find',
      }),
      expect.any(Function)
    );

    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/internal/global_search/searchable_types',
      }),
      expect.any(Function)
    );

    expect(router.delete).toHaveBeenCalledTimes(0);
    expect(router.put).toHaveBeenCalledTimes(0);
  });
});
