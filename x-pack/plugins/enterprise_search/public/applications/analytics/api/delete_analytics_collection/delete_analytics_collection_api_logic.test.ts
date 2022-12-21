/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { deleteAnalyticsCollection } from './delete_analytics_collection_api_logic';

describe('DeleteAnalyticsCollectionApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('DeleteAnalyticsCollectionsApiLogic', () => {
    it('calls the analytics collections list api', async () => {
      const promise = Promise.resolve();
      const id = 'collection';
      http.delete.mockReturnValue(promise);
      const result = deleteAnalyticsCollection({ id });
      await nextTick();
      expect(http.delete).toHaveBeenCalledWith(
        `/internal/enterprise_search/analytics/collections/${id}`
      );
      await expect(result).resolves.toEqual(undefined);
    });
  });
});
