/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { Alert } from './alert';
import { createAlertFactory, getPublicAlertFactory, splitAlerts } from './create_alert_factory';
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "flappingHistory": Array [],
        },
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toMatchInlineSnapshot(`
      Object {
        "meta": Object {
          "flappingHistory": Array [],
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
      autoRecoverAlerts: true,
    });
    alertFactory.create('1');
    expect(alerts).toMatchInlineSnapshot(`
      Object {
        "1": Object {
          "meta": Object {
            "flappingHistory": Array [],
          },
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
      autoRecoverAlerts: true,
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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
      currentRecoveredAlerts: {
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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
      autoRecoverAlerts: true,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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

  test('throws error when checking limit usage if alertLimit.getValue is called but alertLimit.setLimitReached is not', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      autoRecoverAlerts: true,
    });

    const limit = alertFactory.alertLimit.getValue();
    expect(limit).toEqual(1000);

    expect(() => {
      alertFactory.alertLimit.checkLimitUsage();
    }).toThrowErrorMatchingInlineSnapshot(
      `"Rule has not reported whether alert limit has been reached after requesting limit value!"`
    );
  });

  test('does not throw error when checking limit usage if alertLimit.getValue is called and alertLimit.setLimitReached is called with reached = true', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      autoRecoverAlerts: true,
    });

    const limit = alertFactory.alertLimit.getValue();
    expect(limit).toEqual(1000);

    alertFactory.alertLimit.setLimitReached(true);
    alertFactory.alertLimit.checkLimitUsage();
  });

  test('does not throw error when checking limit usage if alertLimit.getValue is called and alertLimit.setLimitReached is called with reached = false', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      autoRecoverAlerts: true,
    });

    const limit = alertFactory.alertLimit.getValue();
    expect(limit).toEqual(1000);

    alertFactory.alertLimit.setLimitReached(false);
    alertFactory.alertLimit.checkLimitUsage();
  });

  test('returns empty array if recovered alerts exist but autoRecoverAlerts is false', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      canSetRecoveryContext: true,
      autoRecoverAlerts: false,
    });
    const result = alertFactory.create('1');
    expect(result).toEqual({
      meta: {
        flappingHistory: [],
      },
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
      `Set autoRecoverAlerts to true on rule type to get access to recovered alerts.`
    );
  });
});

describe('getPublicAlertFactory', () => {
  test('only returns subset of function from given alert factory', () => {
    const alertFactory = createAlertFactory({
      alerts: {},
      logger,
      maxAlerts: 1000,
      autoRecoverAlerts: true,
    });

    expect(alertFactory.create).toBeDefined();
    expect(alertFactory.alertLimit.getValue).toBeDefined();
    expect(alertFactory.alertLimit.setLimitReached).toBeDefined();
    expect(alertFactory.alertLimit.checkLimitUsage).toBeDefined();
    expect(alertFactory.hasReachedAlertLimit).toBeDefined();
    expect(alertFactory.done).toBeDefined();

    const publicAlertFactory = getPublicAlertFactory(alertFactory);

    expect(publicAlertFactory.create).toBeDefined();
    expect(publicAlertFactory.done).toBeDefined();
    expect(publicAlertFactory.alertLimit.getValue).toBeDefined();
    expect(publicAlertFactory.alertLimit.setLimitReached).toBeDefined();

    // @ts-expect-error
    expect(publicAlertFactory.alertLimit.checkLimitUsage).not.toBeDefined();
    // @ts-expect-error
    expect(publicAlertFactory.hasReachedAlertLimit).not.toBeDefined();
  });
});

describe('splitAlerts', () => {
  test('correctly splits alerts into active and recovered', () => {
    const alert1 = new Alert<{ foo: boolean }, {}, string>('1', {
      state: { foo: true },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
    alert1.scheduleActions('default', {});
    const alert2 = new Alert<{ foo: boolean }, {}, string>('2', {
      state: { foo: false },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    }).scheduleActions('default', {});
    const alert3 = new Alert<{ foo: boolean }, {}, string>('3', {
      state: { foo: false },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });

    expect(
      splitAlerts(
        {
          '1': alert1 as Alert<{ foo: boolean }, {}>,
          '2': alert2 as Alert<{ foo: boolean }, {}>,
          '3': alert3 as Alert<{ foo: boolean }, {}>,
        },
        { '3': alert3 as Alert<{ foo: boolean }, {}> }
      )
    ).toEqual({
      // active alerts 1 and 2 have scheduled actions
      active: {
        '1': alert1,
        '2': alert2,
      },
      // alert3 does not have scheduled actions and was a tracked alert so it is recovered
      recovered: { '3': alert3 },
    });
  });

  test('does not consider alert recovered if it was not tracked', () => {
    const alert1 = new Alert<{ foo: boolean }, {}, string>('1', {
      state: { foo: true },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
    alert1.scheduleActions('default', {});
    const alert2 = new Alert<{ foo: boolean }, {}, string>('2', {
      state: { foo: false },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });
    alert2.scheduleActions('default', {});
    const alert3 = new Alert<{ foo: boolean }, {}, string>('3', {
      state: { foo: false },
      meta: { lastScheduledActions: { group: 'default', date: new Date() } },
    });

    expect(
      splitAlerts(
        {
          '1': alert1 as Alert<{ foo: boolean }, {}>,
          '2': alert2 as Alert<{ foo: boolean }, {}>,
          '3': alert3 as Alert<{ foo: boolean }, {}>,
        },
        {}
      )
    ).toEqual({
      // active alerts 1 and 2 have scheduled actions
      active: {
        '1': alert1,
        '2': alert2,
      },
      // alert3 does not have scheduled actions but was not a tracked alert so is not recovered
      recovered: {},
    });
  });
});
