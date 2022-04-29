/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError } from 'axios';

import { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  prepareIncident,
  createServiceError,
  getPushedDate,
  throwIfSubActionIsNotSupported,
  getAccessToken,
  getAxiosInstance,
} from './utils';
import { connectorTokenClientMock } from '../lib/connector_token_client.mock';
import { actionsConfigMock } from '../../actions_config.mock';
import { createJWTAssertion } from '../lib/create_jwt_assertion';
import { requestOAuthJWTToken } from '../lib/request_oauth_jwt_token';

jest.mock('../lib/create_jwt_assertion', () => ({
  createJWTAssertion: jest.fn(),
}));
jest.mock('../lib/request_oauth_jwt_token', () => ({
  requestOAuthJWTToken: jest.fn(),
}));

jest.mock('axios', () => ({
  create: jest.fn(),
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
      } as AxiosError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: Denied: no access'
      );
    });

    test('it creates an error correctly when the ServiceNow error is null', async () => {
      const axiosError = {
        message: 'An error occurred',
        response: { data: { error: null } },
      } as AxiosError;

      expect(createServiceError(axiosError, 'Unable to do action').message).toBe(
        '[Action][ServiceNow]: Unable to do action. Error: An error occurred Reason: unknown: no error in error response'
      );
    });
  });

  describe('getPushedDate', () => {
    beforeAll(() => {
      jest.useFakeTimers('modern');
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

    test('creates axios instance with interceptor when isOAuth is true and OAuth fields are defined', () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: '1',
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10000000000).toISOString(),
        },
      });
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
    });
  });

  describe('getAccessToken', () => {
    const getAccessTokenOpts = {
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
          privateKeyPassword: 'privateKeyPassword',
          username: null,
          password: null,
        },
      },
      snServiceUrl: 'https://dev23432523.service-now.com',
      connectorTokenClient,
    };
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
    });

    test('uses stored access token if it exists', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: '1',
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10000000000).toISOString(),
        },
      });
      const accessToken = await getAccessToken(getAccessTokenOpts);

      expect(accessToken).toEqual('testtokenvalue');
      expect(createJWTAssertion as jest.Mock).not.toHaveBeenCalled();
      expect(requestOAuthJWTToken as jest.Mock).not.toHaveBeenCalled();
    });

    test('creates new assertion if stored access token does not exist', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });
      (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
      (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'access_token',
        accessToken: 'brandnewaccesstoken',
        expiresIn: 1000,
      });

      const accessToken = await getAccessToken(getAccessTokenOpts);

      expect(accessToken).toEqual('access_token brandnewaccesstoken');
      expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
        logger,
        'privateKey',
        'privateKeyPassword',
        {
          audience: 'clientId',
          issuer: 'clientId',
          subject: 'userIdentifierValue',
          keyId: 'jwtKeyId',
        }
      );
      expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
        'https://dev23432523.service-now.com/oauth_token.do',
        { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
        logger,
        configurationUtilities
      );
      expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
        connectorId: '123',
        token: null,
        newToken: 'access_token brandnewaccesstoken',
        expiresInSec: 1000,
        deleteExisting: false,
      });
    });

    test('creates new assertion if stored access token exists but is expired', async () => {
      const createdAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() - 100).toISOString();
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: {
          id: '1',
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt,
          expiresAt,
        },
      });
      (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
      (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'access_token',
        accessToken: 'brandnewaccesstoken',
        expiresIn: 1000,
      });

      const accessToken = await getAccessToken(getAccessTokenOpts);

      expect(accessToken).toEqual('access_token brandnewaccesstoken');
      expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
        logger,
        'privateKey',
        'privateKeyPassword',
        {
          audience: 'clientId',
          issuer: 'clientId',
          subject: 'userIdentifierValue',
          keyId: 'jwtKeyId',
        }
      );
      expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
        'https://dev23432523.service-now.com/oauth_token.do',
        { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
        logger,
        configurationUtilities
      );
      expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
        connectorId: '123',
        token: {
          id: '1',
          connectorId: '123',
          tokenType: 'access_token',
          token: 'testtokenvalue',
          createdAt,
          expiresAt,
        },
        newToken: 'access_token brandnewaccesstoken',
        expiresInSec: 1000,
        deleteExisting: false,
      });
    });

    test('throws error if createJWTAssertion throws error', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });
      (createJWTAssertion as jest.Mock).mockImplementationOnce(() => {
        throw new Error('createJWTAssertion error!!');
      });

      await expect(getAccessToken(getAccessTokenOpts)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"createJWTAssertion error!!"`
      );
    });

    test('throws error if requestOAuthJWTToken throws error', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });
      (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
      (requestOAuthJWTToken as jest.Mock).mockRejectedValueOnce(
        new Error('requestOAuthJWTToken error!!')
      );

      await expect(getAccessToken(getAccessTokenOpts)).rejects.toThrowErrorMatchingInlineSnapshot(
        `"requestOAuthJWTToken error!!"`
      );
    });

    test('logs warning if connectorTokenClient.updateOrReplace throws error', async () => {
      connectorTokenClient.get.mockResolvedValueOnce({
        hasErrors: false,
        connectorToken: null,
      });
      (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
      (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
        tokenType: 'access_token',
        accessToken: 'brandnewaccesstoken',
        expiresIn: 1000,
      });
      connectorTokenClient.updateOrReplace.mockRejectedValueOnce(
        new Error('updateOrReplace error')
      );

      const accessToken = await getAccessToken(getAccessTokenOpts);

      expect(accessToken).toEqual('access_token brandnewaccesstoken');
      expect(logger.warn).toHaveBeenCalledWith(
        `Not able to update ServiceNow connector token for connectorId: 123 due to error: updateOrReplace error`
      );
    });
  });
});
