/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

import { extractErrorMessage, MLHttpFetchError, MLResponseError, EsErrorBody } from '.';

describe('ML - error message utils', () => {
  describe('extractErrorMessage', () => {
    test('returns just the error message', () => {
      const testMsg = 'Saved object [index-pattern/indexpattern] not found';

      // bad error, return empty string
      const badError = {} as any;
      expect(extractErrorMessage(badError)).toBe('');

      // raw es error
      const esErrorMsg: EsErrorBody = {
        error: {
          root_cause: [
            {
              type: 'type',
              reason: 'reason',
            },
          ],
          type: 'type',
          reason: testMsg,
        },
        status: 404,
      };
      expect(extractErrorMessage(esErrorMsg)).toBe(testMsg);

      // error is basic string
      const stringMessage = testMsg;
      expect(extractErrorMessage(stringMessage)).toBe(testMsg);

      // kibana error without attributes
      const bodyWithoutAttributes: MLHttpFetchError<MLResponseError> = {
        name: 'name',
        req: {} as Request,
        request: {} as Request,
        message: 'Something else',
        body: {
          statusCode: 404,
          error: 'error',
          message: testMsg,
        },
      };
      expect(extractErrorMessage(bodyWithoutAttributes)).toBe(testMsg);

      // kibana error with attributes
      const bodyWithAttributes: MLHttpFetchError<MLResponseError> = {
        name: 'name',
        req: {} as Request,
        request: {} as Request,
        message: 'Something else',
        body: {
          statusCode: 404,
          error: 'error',
          message: 'Something else',
          attributes: {
            body: {
              status: 404,
              error: {
                reason: testMsg,
                type: 'type',
                root_cause: [{ type: 'type', reason: 'reason' }],
              },
            },
          },
        },
      };
      expect(extractErrorMessage(bodyWithAttributes)).toBe(testMsg);

      // boom error
      const boomError: Boom.Boom<any> = {
        message: '',
        typeof: Boom.Boom.constructor,
        reformat: () => '',
        name: '',
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
      };
      expect(extractErrorMessage(boomError)).toBe(testMsg);
    });
  });
});
