/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFetchBulkCases } from './use_fetch_bulk_cases';
import { coreMock } from '@kbn/core/public/mocks';

describe('Bulk Get Cases API', () => {
  const abortCtrl = new AbortController();
  const mockCoreSetup = coreMock.createSetup();
  const http = mockCoreSetup.http;

  beforeEach(() => {
    jest.clearAllMocks();
    http.post.mockResolvedValue({ cases: [], errors: [] });
  });

  it('fetch cases correctly', async () => {
    const res = await useFetchBulkCases({ ids: ['test-id'] });
    expect(res).toEqual({ cases: [], errors: [] });
  });

  it('should call http with correct arguments', async () => {
    await useFetchBulkCases({ ids: ['test-id'] });

    expect(http.post).toHaveBeenCalledWith('/internal/cases/_bulk_get', {
      body: '{"ids":["test-id"]}',
      signal: abortCtrl.signal,
    });
  });
});
