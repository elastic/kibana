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
      expect.assertions(1);
      const abortCtrl = new AbortController();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => getApplicationResponse,
      });

      await expect(() =>
        getApplication({
          signal: abortCtrl.signal,
          apiToken: '',
          appId: '',
          url: '',
        })
      ).rejects.toThrow('Received status:');
    });

    it('returns an error when parsing the json fails', async () => {
      expect.assertions(1);

      const abortCtrl = new AbortController();
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('bad');
        },
      });

      await expect(() =>
        getApplication({
          signal: abortCtrl.signal,
          apiToken: '',
          appId: '',
          url: '',
        })
      ).rejects.toThrow('bad');
    });

    it('it removes unsafe fields', async () => {
      const abortCtrl = new AbortController();

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          fields: [
            {
              id: '__proto__',
              name: 'Alert Id',
              key: 'alert-id',
              fieldType: 'text',
            },
            {
              id: 'a6ide',
              name: '__proto__',
              key: 'alert-id',
              fieldType: 'text',
            },
            {
              id: 'a6ide',
              name: 'Alert Id',
              key: '__proto__',
              fieldType: 'text',
            },
            {
              id: 'a6ide',
              name: 'Alert Id',
              key: 'alert-id',
              fieldType: '__proto__',
            },
            {
              id: 'safe-id',
              name: 'Safe',
              key: 'safe-key',
              fieldType: 'safe-text',
            },
          ],
        }),
      });

      const res = await getApplication({
        signal: abortCtrl.signal,
        apiToken: '',
        appId: '',
        url: '',
      });

      expect(res).toEqual({
        fields: [
          {
            id: 'safe-id',
            name: 'Safe',
            key: 'safe-key',
            fieldType: 'safe-text',
          },
        ],
      });
    });
  });
});
