/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { bulkGetCases } from './api';
import { coreMock } from '@kbn/core/public/mocks';

describe('Alerts table APIs', () => {
  const abortCtrl = new AbortController();
  const mockCoreSetup = coreMock.createSetup();
  const http = mockCoreSetup.http;

  beforeEach(() => {
    jest.clearAllMocks();
    http.post.mockResolvedValue({ cases: [], errors: [] });
  });

  describe('bulkGetCases', () => {
    it('fetch cases correctly', async () => {
      const res = await bulkGetCases(
        http,
        { ids: ['test-id'], fields: ['title'] },
        abortCtrl.signal
      );

      expect(res).toEqual({ cases: [], errors: [] });
    });

    it('should call http with correct arguments', async () => {
      await bulkGetCases(http, { ids: ['test-id'], fields: ['title'] }, abortCtrl.signal);

      expect(http.post).toHaveBeenCalledWith('/internal/cases/_bulk_get', {
        body: '{"ids":["test-id"],"fields":["title"]}',
        signal: abortCtrl.signal,
      });
    });
  });
});
