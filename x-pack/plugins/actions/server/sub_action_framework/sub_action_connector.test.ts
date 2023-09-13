/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import axios, { AxiosError, AxiosHeaders, AxiosInstance, AxiosResponse } from 'axios';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { MockedLogger } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { actionsMock } from '../mocks';
import { TestSubActionConnector } from './mocks';
import { ActionsConfigurationUtilities } from '../actions_config';
import * as utils from '../lib/axios_utils';

jest.mock('axios');

jest.mock('../lib/axios_utils', () => {
  const originalUtils = jest.requireActual('../lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

const axiosMock = axios as jest.Mocked<typeof axios>;
const requestMock = utils.request as jest.Mock;
const createAxiosError = (): AxiosError => {
  const error = new Error() as AxiosError;
  error.isAxiosError = true;
  error.config = { method: 'get', url: 'https://example.com', headers: new AxiosHeaders() };
  error.response = {
    data: { errorMessage: 'An error occurred', errorCode: 500 },
  } as AxiosResponse;

  return error;
};

describe('SubActionConnector', () => {
  const axiosInstanceMock = jest.fn();
  let logger: MockedLogger;
  let services: ReturnType<typeof actionsMock.createServices>;
  let mockedActionsConfig: jest.Mocked<ActionsConfigurationUtilities>;
  let service: TestSubActionConnector;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();

    requestMock.mockReturnValue({ data: { status: 'ok' } });
    axiosMock.create.mockImplementation(() => {
      return axiosInstanceMock as unknown as AxiosInstance;
    });

    logger = loggingSystemMock.createLogger();
    services = actionsMock.createServices();
    mockedActionsConfig = actionsConfigMock.create();

    mockedActionsConfig.getResponseSettings.mockReturnValue({
      maxContentLength: 1000000,
      timeout: 360000,
    });

    service = new TestSubActionConnector({
      configurationUtilities: mockedActionsConfig,
      logger,
      connector: { id: 'test-id', type: '.test' },
      config: { url: 'https://example.com' },
      secrets: { username: 'elastic', password: 'changeme' },
      services,
    });
  });

  describe('Sub actions', () => {
    it('gets the sub actions correctly', async () => {
      const subActions = service.getSubActions();
      expect(subActions.get('testUrl')).toEqual({
        method: 'testUrl',
        name: 'testUrl',
        schema: expect.anything(),
      });
    });
  });

  describe('URL validation', () => {
    it('removes double slashes correctly', async () => {
      await service.testUrl({ url: 'https://example.com//api///test-endpoint' });
      expect(requestMock.mock.calls[0][0].url).toBe('https://example.com/api/test-endpoint');
    });

    it('removes the ending slash correctly', async () => {
      await service.testUrl({ url: 'https://example.com/' });
      expect(requestMock.mock.calls[0][0].url).toBe('https://example.com');
    });

    it('throws an error if the url is invalid', async () => {
      expect.assertions(1);
      await expect(async () => service.testUrl({ url: 'invalid-url' })).rejects.toThrow(
        'URL Error: Invalid URL: invalid-url'
      );
    });

    it('throws an error if the url starts with backslashes', async () => {
      expect.assertions(1);
      await expect(async () => service.testUrl({ url: '//example.com/foo' })).rejects.toThrow(
        'URL Error: Invalid URL: //example.com/foo'
      );
    });

    it('throws an error if the protocol is not supported', async () => {
      expect.assertions(1);
      await expect(async () => service.testUrl({ url: 'ftp://example.com' })).rejects.toThrow(
        'URL Error: Invalid protocol'
      );
    });

    it('throws if the host is the URI is not allowed', async () => {
      expect.assertions(1);

      mockedActionsConfig.ensureUriAllowed.mockImplementation(() => {
        throw new Error('URI is not allowed');
      });

      await expect(async () => service.testUrl({ url: 'https://example.com' })).rejects.toThrow(
        'error configuring connector action: URI is not allowed'
      );
    });
  });

  describe('Data', () => {
    it('sets data to an empty object if the data are null', async () => {
      await service.testUrl({ url: 'https://example.com', data: null });

      expect(requestMock).toHaveBeenCalledTimes(1);
      const { data } = requestMock.mock.calls[0][0];
      expect(data).toEqual({});
    });

    it('pass data to axios correctly if not null', async () => {
      await service.testUrl({ url: 'https://example.com', data: { foo: 'foo' } });

      expect(requestMock).toHaveBeenCalledTimes(1);
      const { data } = requestMock.mock.calls[0][0];
      expect(data).toEqual({ foo: 'foo' });
    });

    it('removeNullOrUndefinedFields: removes null values and undefined values correctly', async () => {
      await service.testData({ data: { foo: 'foo', bar: null, baz: undefined } });

      expect(requestMock).toHaveBeenCalledTimes(1);
      const { data } = requestMock.mock.calls[0][0];
      expect(data).toEqual({ foo: 'foo' });
    });

    it.each([[null], [undefined], [[]], [() => {}], [new Date()]])(
      'removeNullOrUndefinedFields: returns data if it is not an object',
      async (dataToTest) => {
        // @ts-expect-error
        await service.testData({ data: dataToTest });

        const { data } = requestMock.mock.calls[0][0];
        expect(data).toEqual({});
      }
    );
  });

  describe('Fetching', () => {
    it('fetch correctly', async () => {
      const res = await service.testUrl({ url: 'https://example.com' });

      expect(requestMock).toHaveBeenCalledTimes(1);
      expect(requestMock).toBeCalledWith({
        axios: axiosInstanceMock,
        configurationUtilities: mockedActionsConfig,
        logger,
        method: 'get',
        data: {},
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Header': 'test',
        },
        url: 'https://example.com',
      });

      expect(logger.debug).toBeCalledWith(
        'Request to external service. Connector Id: test-id. Connector type: .test Method: get. URL: https://example.com'
      );

      expect(res).toEqual({ data: { status: 'ok' } });
    });

    it('validates the response correctly', async () => {
      requestMock.mockReturnValue({ data: { invalidField: 'test' } });
      await expect(async () => service.testUrl({ url: 'https://example.com' })).rejects.toThrow(
        'Response validation failed (Error: [status]: expected value of type [string] but got [undefined])'
      );
    });

    it('formats the response error correctly', async () => {
      requestMock.mockImplementation(() => {
        throw createAxiosError();
      });

      await expect(async () => service.testUrl({ url: 'https://example.com' })).rejects.toThrow(
        'Message: An error occurred. Code: 500'
      );

      expect(logger.debug).toHaveBeenLastCalledWith(
        'Request to external service failed. Connector Id: test-id. Connector type: .test. Method: get. URL: https://example.com'
      );
    });
  });
});
