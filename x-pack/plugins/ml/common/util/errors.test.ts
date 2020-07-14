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
          msg: 'Could not open job because no ML nodes with sufficient capacity were found',
          statusCode: 404,
          response:
            '"{"error":{"root_cause":[{"type":"status_exception","reason":"Could not open job because no ML nodes with sufficient capacity were found"}],"type":"status_exception","reason":"Could not open job because no ML nodes with sufficient capacity were found","caused_by":{"type":"illegal_state_exception","reason":"Could not open job because no suitable nodes were found, allocation explanation [Not opening job [farequote_6gb] on node [{DESKTOP}{ml.machine_memory=16894709760}{ml.max_open_jobs=20}], because this node has insufficient available memory. Available memory for ML [5068412928], memory required by existing jobs [0], estimated memory required for this job [6484393984]]"}},"status":404}"',
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
