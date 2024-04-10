/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios from 'axios';

import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  prepareIncident,
  createServiceError,
  getPushedDate,
  throwIfSubActionIsNotSupported,
  getAxiosInstance,
} from './utils';
import type { ResponseError } from './types';
import { connectorTokenClientMock } from '@kbn/actions-plugin/server/lib/connector_token_client.mock';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import { getOAuthJwtAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token';

jest.mock('@kbn/actions-plugin/server/lib/get_oauth_jwt_access_token', () => ({
  getOAuthJwtAccessToken: jest.fn(),
}));

jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
  AxiosError: jest.requireActual('axios').AxiosError,
}));
const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = {
  interceptors: {
    request: { eject: jest.fn(), use: jest.fn() },
    response: { eject: jest.fn(), use: jest.fn() },
  },
};

const connectorTokenClient = connectorTokenClientMock.create();
const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
/**
 * The purpose of this test is to
 * prevent developers from accidentally
 * change important configuration values
 * such as the scope or the import set table
 * of our ServiceNow application
 */
describe('utils', () => {
  describe('prepareIncident', () => {
    test('it prepares the incident correctly when useOldApi=false', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(false, incident);
      expect(newIncident).toEqual({ u_short_description: 'title', u_description: 'desc' });
    });

    test('it prepares the incident correctly when useOldApi=true', async () => {
      const incident = { short_description: 'title', description: 'desc' };
      const newIncident = prepareIncident(true, incident);
      expect(newIncident).toEqual(incident);
    });
  });

  describe('createServiceError', () => {
    test('it creates an error when the response is null', async () => {
      const error = new Error('An error occurred');
      // @ts-expect-error
      expect(createServiceError(error, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: errorResponse was null'
      );
    });

    test('it creates an error with response correctly', async () => {
      const axiosError = {
        message: 'An error occurred',
        response: { data: { error: { message: 'Denied', detail: 'no access' } } },
      } as ResponseError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: Denied: no access'
      );
    });

    test('it creates an error correctly when the ServiceNow error is null', async () => {
      const axiosError = {
        message: 'An error occurred',
        response: { data: { error: null } },
      } as ResponseError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: no error in error response'
      );
    });
  });

  describe('getPushedDate', () => {
    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2021-10-04 11:15:06 GMT'));
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    test('it formats the date correctly if timestamp is provided', async () => {
      expect(getPushedDate('2021-10-04 11:15:06')).toBe('2021-10-04T11:15:06.000Z');
    });

    test('it formats the date correctly if timestamp is not provided', async () => {
      expect(getPushedDate()).toBe('2021-10-04T11:15:06.000Z');
    });
  });

  describe('throwIfSubActionIsNotSupported', () => {
    const api = { pushToService: 'whatever' };

    test('it throws correctly if the subAction is not supported', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'addEvent',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] Unsupported subAction type addEvent');
    });

    test('it throws correctly if the subAction is not implemented', async () => {
      expect.assertions(1);

      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['getChoices'],
          logger,
        })
      ).toThrow('[Action][ExternalService] subAction pushToService not implemented.');
    });

    test('it does not throw if the sub action is supported and implemented', async () => {
      expect(() =>
        throwIfSubActionIsNotSupported({
          api,
          subAction: 'pushToService',
          supportedSubActions: ['pushToService'],
          logger,
        })
      ).not.toThrow();
    });
  });

  describe('getAxiosInstance', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
    });

    test('creates axios instance with basic auth when isOAuth is false and username and password are defined', () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: false,
            clientId: null,
            jwtKeyId: null,
            userIdentifierValue: null,
          },
          secrets: {
            clientSecret: null,
            privateKey: null,
            privateKeyPassword: null,
            username: 'username',
            password: 'password',
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });

      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith({
        auth: { password: 'password', username: 'username' },
      });
    });

    test('creates axios instance with interceptor when isOAuth is true and OAuth fields are defined', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });

      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockRequestCallback = (axiosInstanceMock.interceptors.request.use as jest.Mock).mock
        .calls[0][0];
      expect(await mockRequestCallback({ headers: {} })).toEqual({
        headers: new axios.AxiosHeaders({ Authorization: 'Bearer tokentokentoken' }),
      });

      expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          },
        },
        tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
        connectorTokenClient,
      });
    });

    test('throws expected error if getOAuthJwtAccessToken returns null access token', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce(null);

      const mockRequestCallback = (axiosInstanceMock.interceptors.request.use as jest.Mock).mock
        .calls[0][0];

      await expect(() =>
        mockRequestCallback({ headers: {} })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Unable to retrieve access token for connectorId: 123"`
      );

      expect(getOAuthJwtAccessToken as jest.Mock).toHaveBeenCalledWith({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
          },
        },
        tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
        connectorTokenClient,
      });
    });

    test('deletes saved access tokens if 4xx response received', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axiosInstanceMock.interceptors.response.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockResponseCallback = (axiosInstanceMock.interceptors.response.use as jest.Mock).mock
        .calls[0][1];

      const errorResponse = {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              message: 'Insufficient rights to query records',
              detail: 'Field(s) present in the query do not have permission to be read',
            },
            status: 'failure',
          },
        },
      };

      await expect(() => mockResponseCallback(errorResponse)).rejects.toEqual(errorResponse);

      expect(connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
        connectorId: '123',
      });
    });

    test('does not delete saved access token if not 4xx error response received', async () => {
      getAxiosInstance({
        connectorId: '123',
        logger,
        configurationUtilities,
        credentials: {
          config: {
            apiUrl: 'https://servicenow',
            usesTableApi: true,
            isOAuth: true,
            clientId: 'clientId',
            jwtKeyId: 'jwtKeyId',
            userIdentifierValue: 'userIdentifierValue',
          },
          secrets: {
            clientSecret: 'clientSecret',
            privateKey: 'privateKey',
            privateKeyPassword: null,
            username: null,
            password: null,
          },
        },
        snServiceUrl: 'https://dev23432523.service-now.com',
        connectorTokenClient,
      });
      expect(createAxiosInstanceMock).toHaveBeenCalledTimes(1);
      expect(createAxiosInstanceMock).toHaveBeenCalledWith();
      expect(axiosInstanceMock.interceptors.request.use).toHaveBeenCalledTimes(1);
      expect(axiosInstanceMock.interceptors.response.use).toHaveBeenCalledTimes(1);

      (getOAuthJwtAccessToken as jest.Mock).mockResolvedValueOnce('Bearer tokentokentoken');

      const mockResponseCallback = (axiosInstanceMock.interceptors.response.use as jest.Mock).mock
        .calls[0][1];

      const errorResponse = {
        response: {
          status: 500,
          statusText: 'Server error',
        },
      };

      await expect(() => mockResponseCallback(errorResponse)).rejects.toEqual(errorResponse);

      expect(connectorTokenClient.deleteConnectorTokens).not.toHaveBeenCalled();
    });
  });
});
