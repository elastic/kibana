/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { toKnownError } from './error_utils';
import { nestedProcessorsErrorFixture } from '../../../../../__jest__/client_integration/fixtures';

describe('toKnownError', () => {
  test('undefined, null, numbers, arrays and bad objects', () => {
    expect(toKnownError(undefined)).toEqual({ errors: [{ reason: 'An unknown error occurred.' }] });
    expect(toKnownError(null)).toEqual({ errors: [{ reason: 'An unknown error occurred.' }] });
    expect(toKnownError(123)).toEqual({ errors: [{ reason: 'An unknown error occurred.' }] });
    expect(toKnownError([])).toEqual({ errors: [{ reason: 'An unknown error occurred.' }] });
    expect(toKnownError({})).toEqual({ errors: [{ reason: 'An unknown error occurred.' }] });
    expect(toKnownError({ attributes: {} })).toEqual({
      errors: [{ reason: 'An unknown error occurred.' }],
    });
  });

  test('non-processors errors', () => {
    expect(toKnownError(new Error('my error'))).toEqual({ errors: [{ reason: 'my error' }] });
    expect(toKnownError({ message: 'my error' })).toEqual({ errors: [{ reason: 'my error' }] });
  });

  test('processors errors', () => {
    expect(toKnownError(nestedProcessorsErrorFixture)).toMatchInlineSnapshot(`
      Object {
        "errors": Array [
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "csv",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
          Object {
            "processorType": "circle",
            "reason": "[field] required property is missing",
          },
        ],
      }
    `);
  });
});
