/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Type } from '@kbn/config-schema';
import type { IRouter, RequestHandler, RequestHandlerContext, RouteConfig } from '@kbn/core/server';
import { kibanaResponseFactory } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';

import type { EncryptionKeyRotationService } from '../crypto';
import { routeDefinitionParamsMock } from './index.mock';
import { defineKeyRotationRoutes } from './key_rotation';

describe('Key rotation routes', () => {
  let router: jest.Mocked<IRouter>;
  let mockContext: RequestHandlerContext;
  let mockEncryptionKeyRotationService: jest.Mocked<EncryptionKeyRotationService>;
  beforeEach(() => {
    const routeParamsMock = routeDefinitionParamsMock.create({
      keyRotation: { decryptionOnlyKeys: ['b'.repeat(32)] },
    });
    router = routeParamsMock.router;
    mockEncryptionKeyRotationService = routeParamsMock.encryptionKeyRotationService;

    mockContext = {} as unknown as RequestHandlerContext;

    defineKeyRotationRoutes(routeParamsMock);
  });

  describe('rotate', () => {
    let routeHandler: RequestHandler<any, any, any>;
    let routeConfig: RouteConfig<any, any, any, any>;
    beforeEach(() => {
      const [rotateRouteConfig, rotateRouteHandler] = router.post.mock.calls.find(
        ([{ path }]) => path === '/api/encrypted_saved_objects/_rotate_key'
      )!;

      routeConfig = rotateRouteConfig;
      routeHandler = rotateRouteHandler;
    });

    it('correctly defines route.', () => {
      expect(routeConfig.options).toEqual({ tags: ['access:rotateEncryptionKey'] });
      expect(routeConfig.validate).toEqual({
        body: undefined,
        query: expect.any(Type),
        params: undefined,
      });

      const queryValidator = (routeConfig.validate as any).query as Type<any>;
      expect(
        queryValidator.validate({
          batch_size: 100,
          type: 'some-type',
        })
      ).toEqual({
        batch_size: 100,
        type: 'some-type',
      });
      expect(queryValidator.validate({ batch_size: 1 })).toEqual({ batch_size: 1 });
      expect(queryValidator.validate({ batch_size: 10000 })).toEqual({ batch_size: 10000 });
      expect(queryValidator.validate({})).toEqual({ batch_size: 10000 });

      expect(() => queryValidator.validate({ batch_size: 0 })).toThrowErrorMatchingInlineSnapshot(
        `"[batch_size]: Value must be equal to or greater than [1]."`
      );
      expect(() =>
        queryValidator.validate({ batch_size: 10001 })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[batch_size]: Value must be equal to or lower than [10000]."`
      );

      expect(() => queryValidator.validate({ type: 100 })).toThrowErrorMatchingInlineSnapshot(
        `"[type]: expected value of type [string] but got [number]"`
      );
    });

    it('returns 400 if decryption only keys are not specified.', async () => {
      const routeParamsMock = routeDefinitionParamsMock.create();
      defineKeyRotationRoutes(routeParamsMock);
      const [, rotateRouteHandler] = routeParamsMock.router.post.mock.calls.find(
        ([{ path }]) => path === '/api/encrypted_saved_objects/_rotate_key'
      )!;

      await expect(
        rotateRouteHandler(mockContext, httpServerMock.createKibanaRequest(), kibanaResponseFactory)
      ).resolves.toEqual({
        status: 400,
        payload:
          'Kibana is not configured to support encryption key rotation. Update `kibana.yml` to include `xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys` to rotate your encryption keys.',
        options: {
          body: 'Kibana is not configured to support encryption key rotation. Update `kibana.yml` to include `xpack.encryptedSavedObjects.keyRotation.decryptionOnlyKeys` to rotate your encryption keys.',
        },
      });
    });

    it('returns 500 if `rotate` throws unhandled exception.', async () => {
      const unhandledException = new Error('Something went wrong.');
      mockEncryptionKeyRotationService.rotate.mockRejectedValue(unhandledException);

      const mockRequest = httpServerMock.createKibanaRequest({ query: { batch_size: 1234 } });
      const response = await routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      expect(response.status).toBe(500);
      expect(response.payload).toEqual(unhandledException);
      expect(mockEncryptionKeyRotationService.rotate).toHaveBeenCalledWith(mockRequest, {
        batchSize: 1234,
      });
    });

    it('returns whatever `rotate` returns.', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ query: { batch_size: 1234 } });
      mockEncryptionKeyRotationService.rotate.mockResolvedValue({
        total: 3,
        successful: 6,
        failed: 0,
      });

      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { total: 3, successful: 6, failed: 0 },
        options: { body: { total: 3, successful: 6, failed: 0 } },
      });
    });

    it('returns 429 if called while rotation is in progress.', async () => {
      const mockRequest = httpServerMock.createKibanaRequest({ query: { batch_size: 1234 } });
      mockEncryptionKeyRotationService.rotate.mockResolvedValue({
        total: 3,
        successful: 6,
        failed: 0,
      });

      // Run rotation, but don't wait until it's complete.
      const firstRequestPromise = routeHandler(mockContext, mockRequest, kibanaResponseFactory);

      // Try to run rotation once again.
      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 429,
        payload:
          'Encryption key rotation is in progress already. Please wait until it is completed and try again.',
        options: {
          statusCode: 429,
          body: 'Encryption key rotation is in progress already. Please wait until it is completed and try again.',
        },
      });

      // Initial request properly resolves.
      await expect(firstRequestPromise).resolves.toEqual({
        status: 200,
        payload: { total: 3, successful: 6, failed: 0 },
        options: { body: { total: 3, successful: 6, failed: 0 } },
      });

      // And subsequent requests resolve properly too.
      await expect(routeHandler(mockContext, mockRequest, kibanaResponseFactory)).resolves.toEqual({
        status: 200,
        payload: { total: 3, successful: 6, failed: 0 },
        options: { body: { total: 3, successful: 6, failed: 0 } },
      });
    });
  });
});
