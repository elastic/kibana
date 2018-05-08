/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';

import * as errors from '../errors';

describe('lib/errors', function () {
  describe('#wrapError', () => {
    it('returns given object', () => {
      const err = new Error();
      const returned = errors.wrapError(err);
      expect(returned).to.equal(err);
    });
    it('error becomes boom error', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err.isBoom).to.equal(true);
    });
    it('defaults output.statusCode to 500', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err.output.statusCode).to.equal(500);
    });
    it('sets output.statusCode to .status if given', () => {
      const err = new Error();
      err.status = 400;
      errors.wrapError(err);
      expect(err.output.statusCode).to.equal(400);
    });
    it('defaults message to "Internal Server Error"', () => {
      const err = new Error();
      errors.wrapError(err);
      expect(err.message).to.equal('Internal Server Error');
    });
    it('sets custom message if a 400 level error', () => {
      const err = new Error('wat');
      err.status = 499;
      errors.wrapError(err);
      expect(err.output.payload.message).to.equal('wat');
    });
  });
});
