/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import { RouterMock, routeDependencies, RequestMock } from '../../../test/helpers';

import { registerDataStreamRoutes } from '.';

describe('Data streams API', () => {
  const router = new RouterMock();

  beforeEach(() => {
    registerDataStreamRoutes({
      ...routeDependencies,
      router,
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Update data retention for DS - PUT /internal/index_management/{name}/data_retention', () => {
    const updateDataLifecycle = router.getMockESApiFn('indices.putDataLifecycle');

    it('updates data lifecycle for a given data stream', async () => {
      const mockRequest: RequestMock = {
        method: 'put',
        path: addBasePath('/data_streams/{name}/data_retention'),
        params: { name: 'foo' },
        body: { dataRetention: '7d' },
      };

      updateDataLifecycle.mockResolvedValue({ success: true });

      const res = await router.runRequest(mockRequest);

      expect(res).toEqual({
        body: { success: true },
      });
    });

    it('should return an error if it fails', async () => {
      const mockRequest: RequestMock = {
        method: 'put',
        path: addBasePath('/data_streams/{name}/data_retention'),
        params: { name: 'foo' },
        body: { dataRetention: '7d' },
      };

      const error = new Error('Oh no!');
      updateDataLifecycle.mockRejectedValue(error);

      await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
    });
  });
});
