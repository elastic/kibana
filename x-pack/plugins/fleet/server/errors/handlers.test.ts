/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { errors } from 'elasticsearch';
import { httpServerMock } from 'src/core/server/mocks';
import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';
import {
  IngestManagerError,
  RegistryError,
  PackageNotFoundError,
  PackageUnsupportedMediaTypeError,
  defaultIngestErrorHandler,
} from './index';

const LegacyESErrors = errors as Record<string, any>;
type ITestEsErrorsFnParams = [errorCode: string, error: any, expectedMessage: string];

describe('defaultIngestErrorHandler', () => {
  let mockContract: ReturnType<typeof createAppContextStartContractMock>;
  beforeEach(async () => {
    // prevents `Logger not set.` and other appContext errors
    mockContract = createAppContextStartContractMock();
    appContextService.start(mockContract);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    appContextService.stop();
  });

  async function testEsErrorsFn(...args: ITestEsErrorsFnParams) {
    const [, error, expectedMessage] = args;
    jest.clearAllMocks();
    const response = httpServerMock.createResponseFactory();
    await defaultIngestErrorHandler({ error, response });

    // response
    expect(response.ok).toHaveBeenCalledTimes(0);
    expect(response.customError).toHaveBeenCalledTimes(1);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: error.status,
      body: { message: expectedMessage },
    });

    // logging
    expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
    expect(mockContract.logger?.error).toHaveBeenCalledWith(expectedMessage);
  }

  describe('use the HTTP error status code provided by LegacyESErrors', () => {
    const statusCodes = Object.keys(LegacyESErrors).filter((key) => /^\d+$/.test(key));
    const errorCodes = statusCodes.filter((key) => parseInt(key, 10) >= 400);
    const casesWithPathResponse: ITestEsErrorsFnParams[] = errorCodes.map((errorCode) => [
      errorCode,
      new LegacyESErrors[errorCode]('the root message', {
        path: '/path/to/call',
        response: 'response is here',
      }),
      'the root message response from /path/to/call: response is here',
    ]);
    const casesWithOtherMeta: ITestEsErrorsFnParams[] = errorCodes.map((errorCode) => [
      errorCode,
      new LegacyESErrors[errorCode]('the root message', {
        other: '/path/to/call',
        props: 'response is here',
      }),
      'the root message',
    ]);
    const casesWithoutMeta: ITestEsErrorsFnParams[] = errorCodes.map((errorCode) => [
      errorCode,
      new LegacyESErrors[errorCode]('some message'),
      'some message',
    ]);

    test.each(casesWithPathResponse)('%d - with path & response', testEsErrorsFn);
    test.each(casesWithOtherMeta)('%d - with other metadata', testEsErrorsFn);
    test.each(casesWithoutMeta)('%d - without metadata', testEsErrorsFn);
  });

  describe('IngestManagerError', () => {
    it('502: RegistryError', async () => {
      const error = new RegistryError('xyz');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 502,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith(error.message);
    });

    it('415: PackageUnsupportedMediaType', async () => {
      const error = new PackageUnsupportedMediaTypeError('123');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 415,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith(error.message);
    });

    it('404: PackageNotFoundError', async () => {
      const error = new PackageNotFoundError('123');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith(error.message);
    });

    it('400: IngestManagerError', async () => {
      const error = new IngestManagerError('123');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith(error.message);
    });
  });

  describe('Boom', () => {
    it('500: constructor - one arg', async () => {
      const error = new Boom('bam');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: 'An internal server error occurred' },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith('An internal server error occurred');
    });

    it('custom: constructor - 2 args', async () => {
      const error = new Boom('Problem doing something', {
        statusCode: 456,
      });
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 456,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith('Problem doing something');
    });

    it('400: Boom.badRequest', async () => {
      const error = Boom.badRequest('nope');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 400,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith('nope');
    });

    it('404: Boom.notFound', async () => {
      const error = Boom.notFound('sorry');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 404,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith('sorry');
    });
  });

  describe('all other errors', () => {
    it('500', async () => {
      const error = new Error('something');
      const response = httpServerMock.createResponseFactory();

      await defaultIngestErrorHandler({ error, response });

      // response
      expect(response.ok).toHaveBeenCalledTimes(0);
      expect(response.customError).toHaveBeenCalledTimes(1);
      expect(response.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: error.message },
      });

      // logging
      expect(mockContract.logger?.error).toHaveBeenCalledTimes(1);
      expect(mockContract.logger?.error).toHaveBeenCalledWith(error);
    });
  });
});
