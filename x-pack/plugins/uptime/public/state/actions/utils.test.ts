/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from 'kibana/public';
import { createAsyncAction } from './utils';

describe('createAsyncAction', () => {
  it('creates an object with actions + payloads', () => {
    const action = createAsyncAction<string, number>('TEST');
    expect(action.get('test')).toMatchInlineSnapshot(`
      Object {
        "payload": "test",
        "type": "TEST",
      }
    `);
    expect(action.success(123)).toMatchInlineSnapshot(`
      Object {
        "payload": 123,
        "type": "TEST_SUCCESS",
      }
    `);
    expect(action.fail(new Error('test') as IHttpFetchError)).toMatchInlineSnapshot(`
      Object {
        "error": true,
        "payload": [Error: test],
        "type": "TEST_FAIL",
      }
    `);
  });
});
