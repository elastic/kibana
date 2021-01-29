/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { errors as esErrors } from '@elastic/elasticsearch';
import { errors as legacyESErrors } from 'elasticsearch';
import * as errors from './errors';
import { securityMock } from './mocks';

describe('lib/errors', () => {
  describe('#wrapError', () => {
    it('returns given object', () => {
      const err = new Error();
      const returned = errors.wrapError(err);
      expect(returned).toEqual(err);
    });

    it('error becomes boom error', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err).toHaveProperty('isBoom', true);
    });

    it('defaults output.statusCode to 500', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err).toHaveProperty('output.statusCode', 500);
    });

    it('sets output.statusCode to .status if given', () => {
      const err: any = new Error();
      err.status = 400;
      errors.wrapError(err);
      expect(err).toHaveProperty('output.statusCode', 400);
    });

    it('defaults message to "Internal Server Error"', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err.message).toBe('Internal Server Error');
    });

    it('sets custom message if a 400 level error', () => {
      const err: any = new Error('wat');
      err.status = 499;
      errors.wrapError(err);
      expect(err).toHaveProperty('output.payload.message', 'wat');
    });
  });

  describe('#getErrorStatusCode', () => {
    it('extracts status code from Boom error', () => {
      expect(errors.getErrorStatusCode(Boom.badRequest())).toBe(400);
      expect(errors.getErrorStatusCode(Boom.unauthorized())).toBe(401);
    });

    it('extracts status code from Elasticsearch client response error', () => {
      expect(
        errors.getErrorStatusCode(
          new esErrors.ResponseError(securityMock.createApiResponse({ statusCode: 400, body: {} }))
        )
      ).toBe(400);
      expect(
        errors.getErrorStatusCode(
          new esErrors.ResponseError(securityMock.createApiResponse({ statusCode: 401, body: {} }))
        )
      ).toBe(401);
    });

    it('extracts status code from legacy Elasticsearch client error', () => {
      expect(errors.getErrorStatusCode(new legacyESErrors.BadRequest())).toBe(400);
      expect(errors.getErrorStatusCode(new legacyESErrors.AuthenticationException())).toBe(401);
    });

    it('extracts status code from `status` property', () => {
      expect(errors.getErrorStatusCode({ statusText: 'Bad Request', status: 400 })).toBe(400);
      expect(errors.getErrorStatusCode({ statusText: 'Unauthorized', status: 401 })).toBe(401);
    });
  });

  describe('#getDetailedErrorMessage', () => {
    it('extracts body payload from Boom error', () => {
      expect(errors.getDetailedErrorMessage(Boom.badRequest())).toBe(
        JSON.stringify({ statusCode: 400, error: 'Bad Request', message: 'Bad Request' })
      );
      expect(errors.getDetailedErrorMessage(Boom.unauthorized())).toBe(
        JSON.stringify({ statusCode: 401, error: 'Unauthorized', message: 'Unauthorized' })
      );

      const customBoomError = Boom.unauthorized();
      customBoomError.output.payload = {
        statusCode: 401,
        error: 'some-weird-error',
        message: 'some-weird-message',
      };
      expect(errors.getDetailedErrorMessage(customBoomError)).toBe(
        JSON.stringify({
          statusCode: 401,
          error: 'some-weird-error',
          message: 'some-weird-message',
        })
      );
    });

    it('extracts body from Elasticsearch client response error', () => {
      expect(
        errors.getDetailedErrorMessage(
          new esErrors.ResponseError(
            securityMock.createApiResponse({
              statusCode: 401,
              body: { field1: 'value-1', field2: 'value-2' },
            })
          )
        )
      ).toBe(JSON.stringify({ field1: 'value-1', field2: 'value-2' }));
    });

    it('extracts status code from legacy Elasticsearch client error', () => {
      expect(errors.getDetailedErrorMessage(new legacyESErrors.BadRequest())).toBe('Bad Request');
      expect(errors.getDetailedErrorMessage(new legacyESErrors.AuthenticationException())).toBe(
        'Authentication Exception'
      );
    });

    it('extracts `message` property', () => {
      expect(errors.getDetailedErrorMessage(new Error('some-message'))).toBe('some-message');
    });
  });
});
