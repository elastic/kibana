/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { httpServiceMock } from '../../../../../src/core/server/mocks';
import { registerRoutes } from './index';

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

    expect(router.get).toHaveBeenCalledTimes(0);
    expect(router.delete).toHaveBeenCalledTimes(0);
    expect(router.put).toHaveBeenCalledTimes(0);
  });
});
