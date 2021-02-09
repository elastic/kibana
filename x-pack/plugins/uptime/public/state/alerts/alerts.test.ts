/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IHttpFetchError } from 'kibana/public';
import { createAlertAction } from './alerts';

describe('createAlertAction', () => {
  it('creates actions for `get`, `success`, and `fail`', () => {
    expect(createAlertAction.get()).toMatchInlineSnapshot(`
      Object {
        "type": "CREATE ALERT",
      }
    `);
    expect(createAlertAction.success(null)).toMatchInlineSnapshot(`
      Object {
        "payload": null,
        "type": "CREATE ALERT_SUCCESS",
      }
    `);
    expect(createAlertAction.fail(new Error('test error') as IHttpFetchError))
      .toMatchInlineSnapshot(`
      Object {
        "error": true,
        "payload": [Error: test error],
        "type": "CREATE ALERT_FAIL",
      }
    `);
  });
});
