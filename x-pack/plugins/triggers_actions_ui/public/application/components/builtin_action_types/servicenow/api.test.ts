/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '../../../../../../../../src/core/public/mocks';
import { getChoices, getAppInfo } from './api';

const choicesResponse = {
  status: 'ok',
  data: [
    {
      dependent_value: '',
      label: '1 - Critical',
      value: '1',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '2 - High',
      value: '2',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '3 - Moderate',
      value: '3',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '4 - Low',
      value: '4',
      element: 'priority',
    },
    {
      dependent_value: '',
      label: '5 - Planning',
      value: '5',
      element: 'priority',
    },
  ],
};

const applicationInfoData = {
  result: { name: 'Elastic', scope: 'x_elas2_inc_int', version: '1.0.0' },
};

const applicationInfoResponse = {
  ok: true,
  status: 200,
  json: async () => applicationInfoData,
};

describe('ServiceNow API', () => {
  const http = httpServiceMock.createStartContract();
  let fetchMock: jest.SpyInstance<Promise<unknown>>;

  beforeAll(() => {
    fetchMock = jest.spyOn(window, 'fetch');
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('getChoices', () => {
    test('should call get choices API', async () => {
      const abortCtrl = new AbortController();
      http.post.mockResolvedValueOnce(choicesResponse);
      const res = await getChoices({
        http,
        signal: abortCtrl.signal,
        connectorId: 'te/st',
        fields: ['priority'],
      });

      expect(res).toEqual(choicesResponse);
      expect(http.post).toHaveBeenCalledWith('/api/actions/connector/te%2Fst/_execute', {
        body: '{"params":{"subAction":"getChoices","subActionParams":{"fields":["priority"]}}}',
        signal: abortCtrl.signal,
      });
    });
  });

  describe('getAppInfo', () => {
    test('should call getAppInfo API for ITSM', async () => {
      const abortCtrl = new AbortController();
      fetchMock.mockResolvedValueOnce(applicationInfoResponse);

      const res = await getAppInfo({
        signal: abortCtrl.signal,
        apiUrl: 'https://example.com',
        username: 'test',
        password: 'test',
        actionTypeId: '.servicenow',
      });

      expect(res).toEqual(applicationInfoData.result);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/api/x_elas2_inc_int/elastic_api/health',
        {
          signal: abortCtrl.signal,
          method: 'GET',
          headers: { Authorization: 'Basic dGVzdDp0ZXN0' },
        }
      );
    });

    test('should call getAppInfo API correctly for SIR', async () => {
      const abortCtrl = new AbortController();
      fetchMock.mockResolvedValueOnce(applicationInfoResponse);

      const res = await getAppInfo({
        signal: abortCtrl.signal,
        apiUrl: 'https://example.com',
        username: 'test',
        password: 'test',
        actionTypeId: '.servicenow-sir',
      });

      expect(res).toEqual(applicationInfoData.result);
      expect(fetchMock).toHaveBeenCalledWith(
        'https://example.com/api/x_elas2_sir_int/elastic_api/health',
        {
          signal: abortCtrl.signal,
          method: 'GET',
          headers: { Authorization: 'Basic dGVzdDp0ZXN0' },
        }
      );
    });

    it('returns an error when the response fails', async () => {
      expect.assertions(1);

      const abortCtrl = new AbortController();
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => applicationInfoResponse.json,
      });

      await expect(() =>
        getAppInfo({
          signal: abortCtrl.signal,
          apiUrl: 'https://example.com',
          username: 'test',
          password: 'test',
          actionTypeId: '.servicenow',
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
        getAppInfo({
          signal: abortCtrl.signal,
          apiUrl: 'https://example.com',
          username: 'test',
          password: 'test',
          actionTypeId: '.servicenow',
        })
      ).rejects.toThrow('bad');
    });
  });
});
