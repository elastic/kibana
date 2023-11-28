/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchSearchApplication } from './fetch_search_application_api_logic';

describe('FetchSearchApplicationApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchSearchApplication', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.get.mockReturnValue(promise);
      const result = fetchSearchApplication({ name: 'search-application' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/enterprise_search/search_applications/search-application'
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
