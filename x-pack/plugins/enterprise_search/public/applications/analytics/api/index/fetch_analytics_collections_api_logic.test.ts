/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchAnalyticsCollections } from './fetch_analytics_collections_api_logic';

describe('FetchAnalyticsCollectionsApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FetchAnalyticsCollectionsApiLogic', () => {
    it('calls the analytics collections list api', async () => {
      const promise = Promise.resolve([{ name: 'result' }]);
      http.get.mockReturnValue(promise);
      const result = fetchAnalyticsCollections({});
      await nextTick();
      expect(http.get).toHaveBeenCalledWith('/internal/enterprise_search/analytics/collections', {
        query: { query: '' },
      });
      await expect(result).resolves.toEqual([{ name: 'result' }]);
    });
  });
});
