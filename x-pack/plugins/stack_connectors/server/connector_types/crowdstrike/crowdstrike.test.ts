/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CrowdstrikeConnector } from './crowdstrike';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import { CROWDSTRIKE_CONNECTOR_ID } from '../../../public/common';

const tokenPath = 'https://api.crowdstrike.com/oauth2/token';
const hostPath = 'https://api.crowdstrike.com/devices/entities/devices/v2';
const onlineStatusPath = 'https://api.crowdstrike.com/devices/entities/online-state/v1';
const actionsPath = 'https://api.crowdstrike.com/devices/entities/devices-actions/v2';
describe('CrowdstrikeConnector', () => {
  const connector = new CrowdstrikeConnector({
    configurationUtilities: actionsConfigMock.create(),
    connector: { id: '1', type: CROWDSTRIKE_CONNECTOR_ID },
    config: { url: 'https://api.crowdstrike.com' },
    secrets: { clientId: '123', clientSecret: 'secret' },
    logger: loggingSystemMock.createLogger(),
    services: actionsMock.createServices(),
  });
  let mockedRequest: jest.Mock;

  beforeEach(() => {
    // @ts-expect-error private static - but I still want to reset it
    CrowdstrikeConnector.token = null;
    // @ts-expect-error
    mockedRequest = connector.request = jest.fn() as jest.Mock;
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('executeHostActions', () => {
    it('should make a POST request to the correct URL with correct data', async () => {
      const mockResponse = { data: { id: 'testid', path: 'testpath' } };
      //
      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.executeHostActions({
        command: 'contain',
        ids: ['id1', 'id2'],
      });
      expect(mockedRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: expect.any(String),
          },
          method: 'post',
          responseSchema: expect.any(Object),
          url: tokenPath,
        })
      );
      expect(mockedRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          url: actionsPath,
          method: 'post',
          params: { action_name: 'contain' },
          data: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
        })
      );
      expect(result).toEqual({ id: 'testid', path: 'testpath' });
    });
  });

  describe('getAgentDetails', () => {
    it('should make a GET request to the correct URL with correct params', async () => {
      const mockResponse = { data: { resources: [{}] } };

      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.getAgentDetails({ ids: ['id1', 'id2'] });

      expect(mockedRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: expect.any(String),
          },
          method: 'post',
          responseSchema: expect.any(Object),
          url: tokenPath,
        })
      );
      expect(mockedRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: hostPath,
        })
      );
      expect(result).toEqual({ resources: [{}] });
    });
  });

  describe('getAgentOnlineStatus', () => {
    it('should make a GET request to the correct URL with correct params', async () => {
      const mockResponse = { data: { resources: [{}] } };

      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockResolvedValueOnce(mockResponse);

      const result = await connector.getAgentOnlineStatus({ ids: ['id1', 'id2'] });

      expect(mockedRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: expect.any(String),
          },
          method: 'post',
          responseSchema: expect.any(Object),
          url: tokenPath,
        })
      );
      expect(mockedRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: onlineStatusPath,
        })
      );
      expect(result).toEqual({ resources: [{}] });
    });
  });

  describe('getResponseErrorMessage', () => {
    it('returns errorData message when errorData is present', () => {
      const error = {
        response: {
          data: {
            errors: [{ message: 'Test error message', code: 400 }],
          },
        },
      };

      // @ts-expect-error testing protected method
      const result = connector.getResponseErrorMessage(error);

      expect(result).toBe('Test error message');
    });

    it('returns URL not found message when cause code is ENOTFOUND', () => {
      const error = {
        cause: {
          code: 'ENOTFOUND',
          hostname: 'api.crowdstrike.com111',
        },
      };

      // @ts-expect-error testing protected method
      const result = connector.getResponseErrorMessage(error);

      expect(result).toBe('URL not found: api.crowdstrike.com111');
    });

    it('returns Connection Refused message when cause code is ECONNREFUSED', () => {
      const error = {
        cause: {
          code: 'ECONNREFUSED',
          port: 5555,
          address: 'localhost',
        },
      };

      // @ts-expect-error testing protected method
      const result = connector.getResponseErrorMessage(error);

      expect(result).toBe('Connection Refused: localhost:5555');
    });

    it('returns Unknown API Error message when error response status is undefined', () => {
      const error = {};
      // @ts-expect-error testing protected method
      const result = connector.getResponseErrorMessage(error);

      expect(result).toBe('Unknown API Error: {}');
    });

    it('returns API Error message when error response data is present', () => {
      const error = {
        response: {
          status: 400,
          data: { message: 'Test API error' },
        },
      };
      // @ts-expect-error testing protected method
      const result = connector.getResponseErrorMessage(error);

      expect(result).toBe('API Error: {"message":"Test API error"}');
    });
  });

  describe('getTokenRequest', () => {
    it('should make a POST request to the correct URL with correct headers', async () => {
      const mockResponse = { data: { access_token: 'testToken' } };
      mockedRequest.mockResolvedValueOnce(mockResponse);

      // @ts-expect-error private method - but I still want to
      const result = await connector.getTokenRequest();

      expect(mockedRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: tokenPath,
          method: 'post',
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: expect.stringContaining('Basic'),
          },
        })
      );
      expect(result).toEqual('testToken');
    });
    it('should not call getTokenRequest if the token already exists', async () => {
      const mockResponse = { data: { resources: [{}] } };

      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockResolvedValue(mockResponse);

      await connector.getAgentDetails({ ids: ['id1', 'id2'] });

      expect(mockedRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          headers: {
            accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            authorization: expect.any(String),
          },
          method: 'post',
          responseSchema: expect.any(Object),
          url: tokenPath,
        })
      );
      expect(mockedRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: hostPath,
        })
      );
      expect(mockedRequest).toHaveBeenCalledTimes(2);
      await connector.getAgentDetails({ ids: ['id1', 'id2'] });
      expect(mockedRequest).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer testToken',
          }),
          method: 'GET',
          params: { ids: ['id1', 'id2'] },
          paramsSerializer: expect.any(Function),
          responseSchema: expect.any(Object),
          url: hostPath,
        })
      );
      expect(mockedRequest).toHaveBeenCalledTimes(3);
    });
    it('should throw error when something goes wrong', async () => {
      const mockResponse = { code: 400, message: 'something goes wrong' };

      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockRejectedValueOnce(mockResponse);

      await expect(() => connector.getAgentDetails({ ids: ['id1', 'id2'] })).rejects.toThrowError(
        'something goes wrong'
      );
      expect(mockedRequest).toHaveBeenCalledTimes(2);
    });
    it('should repeat the call one time if theres 401 error ', async () => {
      const mockResponse = { code: 401, message: 'access denied, invalid bearer token' };

      mockedRequest.mockResolvedValueOnce({ data: { access_token: 'testToken' } });
      mockedRequest.mockRejectedValueOnce(mockResponse);

      await expect(() => connector.getAgentDetails({ ids: ['id1', 'id2'] })).rejects.toThrowError();
      expect(mockedRequest).toHaveBeenCalledTimes(3);
    });
  });
});
