/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mockHttpValues } from '../../../__mocks__/kea_logic';

import { nextTick } from '@kbn/test-jest-helpers';

import { startSync } from './start_sync_api_logic';

describe('startSync', () => {
  const { http } = mockHttpValues;
  beforeEach(() => {
    jest.clearAllMocks();
  });
  describe('generateApiKey', () => {
    it('calls correct api', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const result = startSync({ connectorId: 'connectorId' });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connectorId/start_sync',
        { body: '{}' }
      );
      await expect(result).resolves.toEqual('result');
    });

    it('calls correct api with nextSyncConfig', async () => {
      const promise = Promise.resolve('result');
      http.post.mockReturnValue(promise);
      const nextSyncConfig = { max_crawl_depth: 3 };
      const result = startSync({ connectorId: 'connectorId', nextSyncConfig });
      const body = JSON.stringify({ nextSyncConfig: JSON.stringify(nextSyncConfig) });
      await nextTick();
      expect(http.post).toHaveBeenCalledWith(
        '/internal/enterprise_search/connectors/connectorId/start_sync',
        { body }
      );
      await expect(result).resolves.toEqual('result');
    });
  });
});
