/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { getAlerts } from './get_alerts';
import { Alert } from '../alert';
import { DefaultActionGroupId } from '../types';

describe('getAlerts', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  describe('newAlerts', () => {
    test('considers alert new if it has scheduled actions and its id is not in originalAlertIds list', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      newAlert.scheduleActions('default', { foo: '1' });

      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      existingAlert1.scheduleActions('default', { foo: '1' });

      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      existingAlert2.scheduleActions('default', { foo: '2' });

      const { newAlerts } = getAlerts(
        {
          '1': newAlert as Alert<{}, {}>,
          '2': existingAlert1 as Alert<{}, {}>,
          '3': existingAlert2 as Alert<{}, {}>,
        },
        new Set(['2', '3'])
      );

      expect(newAlerts).toEqual({ '1': newAlert });
    });

    test('sets start time in new alert state', () => {
      const newAlert1 = new Alert<{}, {}, DefaultActionGroupId>('1');
      newAlert1.scheduleActions('default', { foo: '1' });

      const newAlert2 = new Alert<{}, {}, DefaultActionGroupId>('2');
      newAlert2.scheduleActions('default', { foo: '1' });

      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('3');
      existingAlert1.scheduleActions('default', { foo: '1' });

      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('4');
      existingAlert2.scheduleActions('default', { foo: '2' });

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const { newAlerts } = getAlerts(
        {
          '1': newAlert1 as Alert<{}, {}>,
          '2': newAlert2 as Alert<{}, {}>,
          '3': existingAlert1 as Alert<{}, {}>,
          '4': existingAlert2 as Alert<{}, {}>,
        },
        new Set(['3', '4'])
      );

      expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });

      const newAlert1State = newAlerts['1'].getState();
      const newAlert2State = newAlerts['2'].getState();

      // @ts-expect-error
      expect(newAlert1State.start).toEqual('1970-01-01T00:00:00.000Z');
      // @ts-expect-error
      expect(newAlert2State.start).toEqual('1970-01-01T00:00:00.000Z');

      // @ts-expect-error
      expect(newAlert1State.duration).toEqual('0');
      // @ts-expect-error
      expect(newAlert2State.duration).toEqual('0');

      // @ts-expect-error
      expect(newAlert1State.end).not.toBeDefined();
      // @ts-expect-error
      expect(newAlert2State.end).not.toBeDefined();
    });
  });

  describe('activeAlerts', () => {
    test('considers alert active if it has scheduled actions', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      newAlert.scheduleActions('default', { foo: '1' });

      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      existingAlert1.scheduleActions('default', { foo: '1' });

      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      existingAlert2.scheduleActions('default', { foo: '2' });

      const { activeAlerts } = getAlerts(
        {
          '1': newAlert as Alert<{}, {}>,
          '2': existingAlert1 as Alert<{}, {}>,
          '3': existingAlert2 as Alert<{}, {}>,
        },
        new Set(['2', '3'])
      );

      expect(activeAlerts).toEqual({ '1': newAlert, '2': existingAlert1, '3': existingAlert2 });
    });

    test('updates duration in active alerts if start is available', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      newAlert.scheduleActions('default', { foo: '1' });

      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      existingAlert1.replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlert1.scheduleActions('default', { foo: '1' });

      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      existingAlert2.replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });
      existingAlert2.scheduleActions('default', { foo: '2' });

      const { activeAlerts } = getAlerts(
        {
          '1': newAlert as Alert<{}, {}>,
          '2': existingAlert1 as Alert<{}, {}>,
          '3': existingAlert2 as Alert<{}, {}>,
        },
        new Set(['2', '3'])
      );

      expect(activeAlerts).toEqual({ '1': newAlert, '2': existingAlert1, '3': existingAlert2 });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      // @ts-expect-error
      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      // @ts-expect-error
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      // @ts-expect-error
      expect(activeAlert1State.duration).toEqual('172800000000000');
      // @ts-expect-error
      expect(activeAlert2State.duration).toEqual('59160000000000');

      // @ts-expect-error
      expect(activeAlert1State.end).not.toBeDefined();
      // @ts-expect-error
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('does not update duration in active alerts if start is not available', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      newAlert.scheduleActions('default', { foo: '1' });

      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      existingAlert1.scheduleActions('default', { foo: '1' });

      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      existingAlert2.scheduleActions('default', { foo: '2' });

      const { activeAlerts } = getAlerts(
        {
          '1': newAlert as Alert<{}, {}>,
          '2': existingAlert1 as Alert<{}, {}>,
          '3': existingAlert2 as Alert<{}, {}>,
        },
        new Set(['2', '3'])
      );

      expect(activeAlerts).toEqual({ '1': newAlert, '2': existingAlert1, '3': existingAlert2 });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      // @ts-expect-error
      expect(activeAlert1State.start).not.toBeDefined();
      // @ts-expect-error
      expect(activeAlert2State.start).not.toBeDefined();

      // @ts-expect-error
      expect(activeAlert1State.duration).not.toBeDefined();
      // @ts-expect-error
      expect(activeAlert2State.duration).not.toBeDefined();

      // @ts-expect-error
      expect(activeAlert1State.end).not.toBeDefined();
      // @ts-expect-error
      expect(activeAlert2State.end).not.toBeDefined();
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it has no scheduled actions', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      activeAlert.scheduleActions('default', { foo: '1' });

      const recoveredAlert = new Alert<{}, {}, DefaultActionGroupId>('2');
      recoveredAlert.setContext({ foo: '2' });

      const { recoveredAlerts } = getAlerts(
        {
          '1': activeAlert as Alert<{}, {}>,
          '2': recoveredAlert as Alert<{}, {}>,
        },
        new Set(['1', '2'])
      );

      expect(recoveredAlerts).toEqual({ '2': recoveredAlert });
    });

    test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      activeAlert.scheduleActions('default', { foo: '1' });

      const notRecoveredAlert = new Alert<{}, {}, DefaultActionGroupId>('2');
      const { recoveredAlerts } = getAlerts(
        {
          '1': activeAlert as Alert<{}, {}>,
          '2': notRecoveredAlert as Alert<{}, {}>,
        },
        new Set(['1'])
      );

      expect(recoveredAlerts).toEqual({});
    });

    test('updates duration in recovered alerts if start is available and adds end time', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      activeAlert.scheduleActions('default', { foo: '1' });

      const recoveredAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      recoveredAlert1.replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      recoveredAlert1.setContext({ foo: '2' });

      const recoveredAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      recoveredAlert2.replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });
      recoveredAlert2.setContext({ foo: '2' });

      const { recoveredAlerts } = getAlerts(
        {
          '1': activeAlert as Alert<{}, {}>,
          '2': recoveredAlert1 as Alert<{}, {}>,
          '3': recoveredAlert2 as Alert<{}, {}>,
        },
        new Set(['1', '2', '3'])
      );

      expect(recoveredAlerts).toEqual({ '2': recoveredAlert1, '3': recoveredAlert2 });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      // @ts-expect-error
      expect(recoveredAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      // @ts-expect-error
      expect(recoveredAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      // @ts-expect-error
      expect(recoveredAlert1State.duration).toEqual('172800000000000');
      // @ts-expect-error
      expect(recoveredAlert2State.duration).toEqual('59160000000000');

      // @ts-expect-error
      expect(recoveredAlert1State.end).toEqual('1970-01-01T00:00:00.000Z');
      // @ts-expect-error
      expect(recoveredAlert2State.end).toEqual('1970-01-01T00:00:00.000Z');
    });

    test('does not update duration or set end in recovered alerts if start is not available', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      activeAlert.scheduleActions('default', { foo: '1' });

      const recoveredAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      recoveredAlert1.setContext({ foo: '2' });

      const recoveredAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');
      recoveredAlert2.setContext({ foo: '2' });

      const { recoveredAlerts } = getAlerts(
        {
          '1': activeAlert as Alert<{}, {}>,
          '2': recoveredAlert1 as Alert<{}, {}>,
          '3': recoveredAlert2 as Alert<{}, {}>,
        },
        new Set(['1', '2', '3'])
      );

      expect(recoveredAlerts).toEqual({ '2': recoveredAlert1, '3': recoveredAlert2 });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      // @ts-expect-error
      expect(recoveredAlert1State.start).not.toBeDefined();
      // @ts-expect-error
      expect(recoveredAlert2State.start).not.toBeDefined();

      // @ts-expect-error
      expect(recoveredAlert1State.duration).not.toBeDefined();
      // @ts-expect-error
      expect(recoveredAlert2State.duration).not.toBeDefined();

      // @ts-expect-error
      expect(recoveredAlert1State.end).not.toBeDefined();
      // @ts-expect-error
      expect(recoveredAlert2State.end).not.toBeDefined();
    });
  });
});
