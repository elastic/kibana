/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseEsError } from './es_error_parser';

describe('ES error parser', () => {
  test('should return all the cause of the error', () => {
    const esError = `{
      "error": {
        "reason": "Houston we got a problem",
        "caused_by": {
          "reason": "First reason",
          "caused_by": {
            "reason": "Second reason",
            "caused_by": {
              "reason": "Third reason"
            }
          }
        }
      }
    }`;

    const parsedError = parseEsError(esError);
    expect(parsedError.message).toEqual('Houston we got a problem');
    expect(parsedError.cause).toEqual(['First reason', 'Second reason', 'Third reason']);
  });
});
