/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../src/core/public/mocks';
import { createClientAPI } from '.';

describe('createClientAPI', () => {
  const http = httpServiceMock.createStartContract({ basePath: '' });
  const api = createClientAPI({ http });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getRelatedCases', () => {
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
});
