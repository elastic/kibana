/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { fetchSyncJobs } from './fetch_sync_jobs_api_logic';

describe('FetchSyncJobs', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('fetchSyncJobs', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.get.mockReturnValue(promise);
      const result = fetchSyncJobs({ connectorId: 'connectorId1' });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connectorId1/sync_jobs',
        { query: { page: 0, size: 10 } }
      );
      await expect(result).resolves.toEqual('result');
    });
    it('appends query if specified', async () => {
      const promise = Promise.resolve('result');
      http.get.mockReturnValue(promise);
      const result = fetchSyncJobs({ connectorId: 'connectorId1', page: 10, size: 20 });
      await nextTick();
      expect(http.get).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connectorId1/sync_jobs',
        { query: { page: 10, size: 20 } }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
