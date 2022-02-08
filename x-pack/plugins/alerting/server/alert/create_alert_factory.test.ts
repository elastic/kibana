/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { Alert } from './alert';
import { createAlertFactory } from './create_alert_factory';

let clock: sinon.SinonFakeTimers;

describe('createAlertFactory()', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  test('creates new alerts for ones not passed in', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      setsRecoveryContext: false,
      getRecoveredAlerts: () => ({}),
    });
    const result = alertFactory.create('1');
    expect(result).toMatchInlineSnapshot(`
              Object {
                "meta": Object {},
                "state": Object {},
              }
        `);
  });

  test('reuses existing alerts', () => {
    const alert = new Alert({
      state: { foo: true },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
    const alertFactory = createAlertFactory({
      alerts: {
        '1': alert,
      },
      setsRecoveryContext: false,
      getRecoveredAlerts: () => ({}),
    });
    const result = alertFactory.create('1');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "lastScheduledActions": Object {
            "date": "1970-01-01T00:00:00.000Z",
            "group": "default",
          },
        },
        "state": Object {
          "foo": true,
        },
      }
    `);
  });

  test('mutates given alerts', () => {
    const alerts = {};
    const alertFactory = createAlertFactory({
      alerts,
      setsRecoveryContext: false,
      getRecoveredAlerts: () => ({}),
    });
    alertFactory.create('1');
    expect(alerts).toMatchInlineSnapshot(`
              Object {
                "1": Object {
                  "meta": Object {},
                  "state": Object {},
                },
              }
        `);
  });

  test('throws error when creating alerts after done() is called', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      setsRecoveryContext: false,
      getRecoveredAlerts: () => ({}),
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
    });

    alertFactory.done();

    expect(() => {
      alertFactory.create('2');
    }).toThrowErrorMatchingInlineSnapshot(`"Can't create new alerts after calling done()."`);
  });

  test('returns recovery context functions when setsRecoveryContext is true', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      setsRecoveryContext: true,
      getRecoveredAlerts: jest.fn().mockReturnValue({ foo: 'bar' }),
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
    });

    const { getRecoveredAlerts } = alertFactory.done();
    expect(getRecoveredAlerts).toBeDefined();
    expect(getRecoveredAlerts!()).toEqual({ foo: 'bar' });
  });

  test('returns undefined recovery context functions when setsRecoveryContext is false', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      setsRecoveryContext: false,
      getRecoveredAlerts: jest.fn().mockReturnValue({ foo: 'bar' }),
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
    });

    const { getRecoveredAlerts } = alertFactory.done();
    expect(getRecoveredAlerts).not.toBeDefined();
  });
});
