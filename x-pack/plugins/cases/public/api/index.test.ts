/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { getCases, getCasesMetrics } from '.';
import { allCases, allCasesSnake } from '../containers/mock';

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCases', () => {
    const http = httpServiceMock.createStartContract({ basePath: '' });
    http.get.mockResolvedValue(allCasesSnake);

    it('should return the correct response', async () => {
      expect(await getCases({ http, query: { from: 'now-1d' } })).toEqual(allCases);
    });

    it('should have been called with the correct path', async () => {
      await getCases({ http, query: { perPage: 10 } });
      expect(http.get).toHaveBeenCalledWith('/api/cases/_find', {
        query: { perPage: 10 },
      });
    });
  });

  describe('getCasesMetrics', () => {
    const http = httpServiceMock.createStartContract({ basePath: '' });
    http.get.mockResolvedValue({ mttr: 0 });

    it('should return the correct response', async () => {
      expect(
        await getCasesMetrics({ http, query: { features: ['mttr'], from: 'now-1d' } })
      ).toEqual({ mttr: 0 });
    });

    it('should have been called with the correct path', async () => {
      await getCasesMetrics({ http, query: { features: ['mttr'], to: 'now-1d' } });
      expect(http.get).toHaveBeenCalledWith('/api/cases/metrics', {
        query: { features: ['mttr'], to: 'now-1d' },
      });
    });
  });
});
