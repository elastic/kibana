/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { extractErrorMessage, MLCustomHttpResponseOptions, MLResponseError } from './error_utils';
import expect from '@kbn/expect/expect.js';
import { ResponseError } from 'kibana/server';

describe('ML - error message utils', () => {
  describe('extractErrorMessage', () => {
    test('returns just the error message', () => {
      const bodyWithNestedErrorMsg: MLCustomHttpResponseOptions<MLResponseError> = {
        body: {
          message: {
            msg: 'Not Found',
          },
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithNestedErrorMsg)).to.be('Not Found');

      const bodyWithStringMsg: MLCustomHttpResponseOptions<MLResponseError> = {
        body: {
          msg: 'Not Found',
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithStringMsg)).to.be('Not Found');

      const bodyWithStringMessage: MLCustomHttpResponseOptions<ResponseError> = {
        body: {
          message: 'Not Found',
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithStringMessage)).to.be('Not Found');

      const bodyWithString: MLCustomHttpResponseOptions<ResponseError> = {
        body: 'Not Found',
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithString)).to.be('Not Found');

      const bodyWithError: MLCustomHttpResponseOptions<ResponseError> = {
        body: new Error('Not Found'),
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithError)).to.be('Not Found');
    });
  });
});
