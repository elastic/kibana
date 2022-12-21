/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { checkAnalyticsEventsIndexExists } from './check_analytics_events_index_api_logic';

describe('FetchAnalyticsCollectionApiLogic', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('FetchAnalyticsCollectionsApiLogic', () => {
    it('calls the analytics collections exists api', async () => {
      const promise = Promise.resolve({ exists: true });
      const indexName = 'eventsIndex';
      http.get.mockReturnValue(promise);
      const result = checkAnalyticsEventsIndexExists({ indexName });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        `/internal/enterprise_search/analytics/events/${indexName}/exists`
      );
      await expect(result).resolves.toEqual({ exists: true });
    });
  });
});
