/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchAnalyticsCollection } from './fetch_analytics_collection_api_logic';

describe('FetchAnalyticsCollectionApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FetchAnalyticsCollectionsApiLogic', () => {
    it('calls the analytics collections list api', async () => {
      const promise = Promise.resolve({ id: 'collection', name: 'result' });
      const id = 'collection';
      http.get.mockReturnValue(promise);
      const result = fetchAnalyticsCollection({ id });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/analytics/collections/${id}`
      );
      await expect(result).resolves.toEqual({ id: 'collection', name: 'result' });
    });
  });
});
