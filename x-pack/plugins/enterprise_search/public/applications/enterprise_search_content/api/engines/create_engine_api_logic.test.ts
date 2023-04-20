/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { createEngine } from './create_engine_api_logic';

describe('CreateEngineApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('createEngine', () => {
    it('calls correct api', async () => {
      const engine = { engineName: 'my-engine', indices: ['an-index'] };
      const response = { result: 'created' };
      const promise = Promise.resolve(response);
      http.put.mockReturnValue(promise);
      const result = createEngine(engine);
      await nextTick();
      expect(http.put).toHaveBeenCalledWith('/internal/enterprise_search/engines/my-engine', {
        body: '{"indices":["an-index"],"name":"my-engine"}',
        query: { create: true },
      });
      await expect(result).resolves.toEqual(response);
    });
  });
});
