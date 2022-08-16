/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Alert } from './alert';
import { createAlertFactory } from './create_alert_factory';
import { processAlerts } from '../lib';

jest.mock('../lib', () => ({
  processAlerts: jest.fn(),
}));

let clock: sinon.SinonFakeTimers;
const logger = loggingSystemMock.create().get();

describe('createAlertFactory()', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  test('creates new alerts for ones not passed in', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
    });
    const result = alertFactory.create('1');
    expect(result).toMatchInlineSnapshot(`
              Object {
                "meta": Object {},
                "state": Object {},
              }
        `);
    // @ts-expect-error
    expect(result.getId()).toEqual('1');
  });

  test('reuses existing alerts', () => {
    const alert = new Alert('1', {
      state: { foo: true },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
    const alertFactory = createAlertFactory({
      alerts: {
        '1': alert,
      },
      logger,
      maxAlerts: 1000,
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
      logger,
      maxAlerts: 1000,
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

  test('throws error and sets flag when more alerts are created than allowed', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 3,
    });

    expect(alertFactory.hasReachedAlertLimit()).toBe(false);
    alertFactory.create('1');
    alertFactory.create('2');
    alertFactory.create('3');

    expect(() => {
      alertFactory.create('4');
    }).toThrowErrorMatchingInlineSnapshot(`"Rule reported more than 3 alerts."`);

    expect(alertFactory.hasReachedAlertLimit()).toBe(true);
  });

  test('throws error when creating alerts after done() is called', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
      id: '1',
    });

    alertFactory.done();

    expect(() => {
      alertFactory.create('2');
    }).toThrowErrorMatchingInlineSnapshot(
      `"Can't create new alerts after calling done() in AlertsFactory."`
    );
  });

  test('returns recovered alerts when setsRecoveryContext is true', () => {
    (processAlerts as jest.Mock).mockReturnValueOnce({
      recoveredAlerts: {
        z: {
          id: 'z',
          state: { foo: true },
          meta: { lastScheduledActions: { group: 'default', date: new Date() } },
        },
        y: {
          id: 'y',
          state: { foo: true },
          meta: { lastScheduledActions: { group: 'default', date: new Date() } },
        },
      },
    });
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      canSetRecoveryContext: true,
      maxAlerts: 1000,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
      id: '1',
    });

    const { getRecoveredAlerts: getRecoveredAlertsFn } = alertFactory.done();
    expect(getRecoveredAlertsFn).toBeDefined();
    const recoveredAlerts = getRecoveredAlertsFn!();
    expect(Array.isArray(recoveredAlerts)).toBe(true);
    expect(recoveredAlerts.length).toEqual(2);
  });

  test('returns empty array if no recovered alerts', () => {
    (processAlerts as jest.Mock).mockReturnValueOnce({ recoveredAlerts: {} });
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
      id: '1',
    });

    const { getRecoveredAlerts: getRecoveredAlertsFn } = alertFactory.done();
    const recoveredAlerts = getRecoveredAlertsFn!();
    expect(Array.isArray(recoveredAlerts)).toBe(true);
    expect(recoveredAlerts.length).toEqual(0);
  });

  test('returns empty array if recovered alerts are null', () => {
    (processAlerts as jest.Mock).mockReturnValueOnce({ recoveredAlerts: null });
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
      id: '1',
    });

    const { getRecoveredAlerts: getRecoveredAlertsFn } = alertFactory.done();
    const recoveredAlerts = getRecoveredAlertsFn!();
    expect(Array.isArray(recoveredAlerts)).toBe(true);
    expect(recoveredAlerts.length).toEqual(0);
  });

  test('returns empty array if recovered alerts exist but setsRecoveryContext is false', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: false,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {},
      state: {},
      context: {},
      scheduledExecutionOptions: undefined,
      id: '1',
    });

    const { getRecoveredAlerts: getRecoveredAlertsFn } = alertFactory.done();
    const recoveredAlerts = getRecoveredAlertsFn!();
    expect(Array.isArray(recoveredAlerts)).toBe(true);
    expect(recoveredAlerts.length).toEqual(0);
    expect(logger.debug).toHaveBeenCalledWith(
      `Set doesSetRecoveryContext to true on rule type to get access to recovered alerts.`
    );
  });
});
