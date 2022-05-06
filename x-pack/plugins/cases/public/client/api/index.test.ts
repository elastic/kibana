/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core/public/mocks';
import { createClientAPI } from '.';
import { allCases, allCasesSnake } from '../../containers/mock';

describe('createClientAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRelatedCases', () => {
    const http = httpServiceMock.createStartContract({ basePath: '' });
    const api = createClientAPI({ http });
    const res = [
      {
        id: 'test-id',
        title: 'test',
      },
    ];
    http.get.mockResolvedValue(res);

    it('should return the correct response', async () => {
      expect(await api.getRelatedCases('alert-id', { owner: 'test' })).toEqual(res);
    });

    it('should have been called with the correct path', async () => {
      await api.getRelatedCases('alert-id', { owner: 'test' });
      expect(http.get).toHaveBeenCalledWith('/api/cases/alerts/alert-id', {
        query: { owner: 'test' },
      });
    });

    it('should accept an empty object with no owner', async () => {
      await api.getRelatedCases('alert-id', {});
      expect(http.get).toHaveBeenCalledWith('/api/cases/alerts/alert-id', {
        query: {},
      });
    });
  });

  describe('cases', () => {
    describe('find', () => {
      const http = httpServiceMock.createStartContract({ basePath: '' });
      const api = createClientAPI({ http });
      http.get.mockResolvedValue(allCasesSnake);

      it('should return the correct response', async () => {
        expect(await api.cases.find({ from: 'now-1d' })).toEqual(allCases);
      });

      it('should have been called with the correct path', async () => {
        await api.cases.find({ perPage: 10 });
        expect(http.get).toHaveBeenCalledWith('/api/cases/_find', {
          query: { perPage: 10 },
        });
      });
    });

    describe('getCasesMetrics', () => {
      const http = httpServiceMock.createStartContract({ basePath: '' });
      const api = createClientAPI({ http });
      http.get.mockResolvedValue({ mttr: 0 });

      it('should return the correct response', async () => {
        expect(await api.cases.getCasesMetrics({ features: ['mttr'], from: 'now-1d' })).toEqual({
          mttr: 0,
        });
      });

      it('should have been called with the correct path', async () => {
        await api.cases.getCasesMetrics({ features: ['mttr'], from: 'now-1d' });
        expect(http.get).toHaveBeenCalledWith('/api/cases/metrics', {
          query: { features: ['mttr'], from: 'now-1d' },
        });
      });
    });
  });
});
