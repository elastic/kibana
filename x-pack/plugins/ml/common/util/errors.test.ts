/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  BoomResponse,
  extractErrorMessage,
  MLCustomHttpResponseOptions,
  MLResponseError,
} from './errors';
import { ResponseError } from 'kibana/server';

describe('ML - error message utils', () => {
  describe('extractErrorMessage', () => {
    test('returns just the error message', () => {
      const testMsg = 'Saved object [index-pattern/blahblahblah] not found';

      const bodyWithNestedErrorMsg: MLCustomHttpResponseOptions<MLResponseError> = {
        body: {
          message: {
            msg: testMsg,
          },
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithNestedErrorMsg)).toBe(testMsg);

      const bodyWithStringMsg: MLCustomHttpResponseOptions<MLResponseError> = {
        body: {
          msg: testMsg,
          statusCode: 404,
          response: `{"error":{"reason":"${testMsg}"}}`,
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithStringMsg)).toBe(testMsg);

      const bodyWithStringMessage: MLCustomHttpResponseOptions<ResponseError> = {
        body: {
          message: testMsg,
        },
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithStringMessage)).toBe(testMsg);

      const bodyWithString: MLCustomHttpResponseOptions<ResponseError> = {
        body: testMsg,
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithString)).toBe(testMsg);

      const bodyWithError: MLCustomHttpResponseOptions<ResponseError> = {
        body: new Error(testMsg),
        statusCode: 404,
      };
      expect(extractErrorMessage(bodyWithError)).toBe(testMsg);

      const bodyWithBoomError: MLCustomHttpResponseOptions<BoomResponse> = {
        statusCode: 404,
        body: {
          data: [],
          isBoom: true,
          isServer: false,
          output: {
            statusCode: 404,
            payload: {
              statusCode: 404,
              error: testMsg,
              message: testMsg,
            },
            headers: {},
          },
        },
      };
      expect(extractErrorMessage(bodyWithBoomError)).toBe(testMsg);
    });
  });
});
