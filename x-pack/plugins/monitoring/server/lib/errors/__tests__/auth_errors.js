/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { errors } from 'elasticsearch';
import { forbidden, unauthorized } from 'boom';
import { isAuthError, handleAuthError } from '../auth_errors';

describe('Error handling for 401/403 errors', () => {
  it('ignores an unknown type', () => {
    const err = new errors.Generic();
    expect(isAuthError(err)).to.be(false);
  });

  describe('Boom errors', () => {
    it('handles Forbidden Error defined by Boom', () => {
      const err = forbidden();
      expect(isAuthError(err)).to.be(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).to.be('Insufficient user permissions for monitoring data');
      expect(wrappedErr.isBoom).to.be(true);
      expect(wrappedErr.isServer).to.be(false);
      expect(wrappedErr.data).to.be(null);
      expect(wrappedErr.output).to.eql({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient user permissions for monitoring data'
        },
        headers: {}
      });
    });

    it('handles Unauthorized Error defined by Boom', () => {
      const err = unauthorized();
      expect(isAuthError(err)).to.be(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).to.be('Invalid authentication for monitoring cluster');
      expect(wrappedErr.isBoom).to.be(true);
      expect(wrappedErr.isServer).to.be(false);
      expect(wrappedErr.data).to.be(null);
      expect(wrappedErr.output).to.eql({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid authentication for monitoring cluster'
        },
        headers: {}
      });
    });
  });

  describe('Elasticsearch errors', () => {
    it('handles Forbidden error defined by ElasticsearchJS', () => {
      const err = { statusCode: 401 };
      expect(isAuthError(err)).to.be(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).to.be('Invalid authentication for monitoring cluster');
      expect(wrappedErr.isBoom).to.be(true);
      expect(wrappedErr.isServer).to.be(false);
      expect(wrappedErr.data).to.be(null);
      expect(wrappedErr.output).to.eql({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Invalid authentication for monitoring cluster'
        },
        headers: {}
      });
    });

    it('handles Unauthorized error defined by ElasticsearchJS', () => {
      const err = { statusCode: 403 };
      expect(isAuthError(err)).to.be(true);

      const wrappedErr = handleAuthError(err);
      expect(wrappedErr.message).to.be('Insufficient user permissions for monitoring data');
      expect(wrappedErr.isBoom).to.be(true);
      expect(wrappedErr.isServer).to.be(false);
      expect(wrappedErr.data).to.be(null);
      expect(wrappedErr.output).to.eql({
        statusCode: 403,
        payload: {
          statusCode: 403,
          error: 'Forbidden',
          message: 'Insufficient user permissions for monitoring data'
        },
        headers: {}
      });
    });
  });

});
