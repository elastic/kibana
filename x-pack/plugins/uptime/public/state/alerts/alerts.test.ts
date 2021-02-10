/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  alertsReducer,
  createAsyncLoadingAction,
  initialState,
  resolveAsyncLoadingAction,
} from './alerts';

describe('alertsReducer', () => {
  it('handles async loading', () => {
    const result = alertsReducer(
      initialState,
      createAsyncLoadingAction({ monitorId: 'test-id', monitorName: 'test-name' })
    );
    expect(result.pendingAlertRequests).toMatchInlineSnapshot(`
      Array [
        Object {
          "monitorId": "test-id",
          "monitorName": "test-name",
        },
      ]
    `);
  });

  it('handles async resolution', () => {
    const result = alertsReducer(
      {
        ...initialState,
        pendingAlertRequests: [{ monitorId: 'test-id', monitorName: 'test-name' }],
      },
      resolveAsyncLoadingAction({ monitorId: 'test-id' })
    );
    expect(Array.isArray(result.pendingAlertRequests)).toBe(true);
    expect(result.pendingAlertRequests).toHaveLength(0);
  });
});
