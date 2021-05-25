/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getApplication } from './api';

const getApplicationResponse = {
  fields: [],
};

describe('Swimlane API', () => {
  let fetchMock: jest.SpyInstance<Promise<unknown>>;

  beforeAll(() => jest.spyOn(window, 'fetch'));
  beforeEach(() => {
    jest.resetAllMocks();
    fetchMock = jest.spyOn(window, 'fetch');
  });

  describe('getApplication', () => {
    it('should call getApplication API correctly', async () => {
      const abortCtrl = new AbortController();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => getApplicationResponse,
      });
      const res = await getApplication({
        signal: abortCtrl.signal,
        apiToken: '',
        appId: '',
        url: '',
      });

      expect(res).toEqual(getApplicationResponse);
    });

    it('returns an error when the response fails', async () => {
      const abortCtrl = new AbortController();

      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => getApplicationResponse,
      });

      try {
        await getApplication({
          signal: abortCtrl.signal,
          apiToken: '',
          appId: '',
          url: '',
        });
      } catch (e) {
        expect(e.message).toContain('Received status:');
      }
    });

    it('returns an error when parsing the json fails', async () => {
      const abortCtrl = new AbortController();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad');
        },
      });

      try {
        await getApplication({
          signal: abortCtrl.signal,
          apiToken: '',
          appId: '',
          url: '',
        });
      } catch (e) {
        expect(e.message).toContain('bad');
      }
    });
  });
});
