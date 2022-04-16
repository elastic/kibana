/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { httpServerMock } from '@kbn/core/server/mocks';

import { createAppContextStartContractMock } from '../mocks';
import { appContextService } from '../services';

import {
  IngestManagerError,
  RegistryError,
  PackageNotFoundError,
  PackageUnsupportedMediaTypeError,
  defaultIngestErrorHandler,
} from '.';

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
      const error = new Boom.Boom('bam');
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
      const error = new Boom.Boom('Problem doing something', {
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
