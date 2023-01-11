/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { updateEngine } from './update_engine_api_logic';

describe('UpdateEngineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('updateEngine', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.get.mockReturnValue(promise);
      const result = updateEngine({ engineName: 'my-engine', indices: ['an-index'] });
      await nextTick();
      expect(http.put).toHaveBeenCalledWith('/internal/enterprise_search/engines/my-engine', {
        body: '{"indices": ["an-index"],"name": "my-engine"}',
      });
      await expect(result).resolves.toEqual('result');
    });
  });
});
