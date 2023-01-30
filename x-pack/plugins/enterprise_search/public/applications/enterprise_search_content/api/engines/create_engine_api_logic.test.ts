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
      const promise = Promise.resolve(engine);
      http.post.mockReturnValue(promise);
      const result = createEngine(engine);
      await nextTick();
      expect(http.post).toHaveBeenCalledWith('/internal/enterprise_search/engines', {
        body: '{"indices":["an-index"],"name":"my-engine"}',
      });
      await expect(result).resolves.toEqual(engine);
    });
  });
});
