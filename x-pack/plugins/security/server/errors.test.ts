/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { errors as esErrors } from 'elasticsearch';
import * as errors from './errors';

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

    it('extracts status code from Elasticsearch client error', () => {
      expect(errors.getErrorStatusCode(new esErrors.BadRequest())).toBe(400);
      expect(errors.getErrorStatusCode(new esErrors.AuthenticationException())).toBe(401);
    });

    it('extracts status code from `status` property', () => {
      expect(errors.getErrorStatusCode({ statusText: 'Bad Request', status: 400 })).toBe(400);
      expect(errors.getErrorStatusCode({ statusText: 'Unauthorized', status: 401 })).toBe(401);
    });
  });
});
