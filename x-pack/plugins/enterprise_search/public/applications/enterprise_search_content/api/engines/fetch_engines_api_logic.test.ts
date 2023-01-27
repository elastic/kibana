/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchEngines } from './fetch_engines_api_logic';

describe('FetchEnginesAPILogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchEnginesAPILogic', () => {
    it('request list engines api', async () => {
      const promise = Promise.resolve({ result: 'result' });
      http.get.mockReturnValue(promise);
      const result = fetchEngines({
        meta: { from: 0, size: 10, total: 0 },
      });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/engines', {
        query: { from: 0, size: 10 },
      });

      await expect(result).resolves.toEqual({
        result: 'result',
      });
    });
  });
});
