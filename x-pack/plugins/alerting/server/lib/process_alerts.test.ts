/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { processAlerts } from './process_alerts';
import { Alert } from '../alert';
import { DefaultActionGroupId } from '../types';

describe('processAlerts', () => {
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
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '2' });

      // @ts-expect-error
      const { newAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(newAlerts).toEqual({ '1': newAlert });
    });

    test('sets start time in new alert state', () => {
      const newAlert1 = new Alert<{}, {}, DefaultActionGroupId>('1');
      const newAlert2 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('3');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('4');

      const originalAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert1,
        '2': newAlert2,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '1' });
      updatedAlerts['4'].scheduleActions('default', { foo: '2' });

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      // @ts-expect-error
      const { newAlerts } = processAlerts(updatedAlerts, originalAlerts);

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
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '2' });

      // @ts-expect-error
      const { activeAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });
    });

    test('updates duration in active alerts if start is available', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      originalAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      originalAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '2' });

      // @ts-expect-error
      const { activeAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

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
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '2' });

      // @ts-expect-error
      const { activeAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

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

    test('preserves other state fields', () => {
      const newAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      const existingAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const existingAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      originalAlerts['2'].replaceState({
        stateField1: 'xyz',
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      originalAlerts['3'].replaceState({
        anotherState: true,
        start: '1969-12-31T07:34:00.000Z',
        duration: 23532,
      });

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].scheduleActions('default', { foo: '1' });
      updatedAlerts['3'].scheduleActions('default', { foo: '2' });

      // @ts-expect-error
      const { activeAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      // @ts-expect-error
      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      // @ts-expect-error
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      // @ts-expect-error
      expect(activeAlert1State.stateField1).toEqual('xyz');
      // @ts-expect-error
      expect(activeAlert2State.anotherState).toEqual(true);

      // @ts-expect-error
      expect(activeAlert1State.duration).toEqual('172800000000000');
      // @ts-expect-error
      expect(activeAlert2State.duration).toEqual('59160000000000');

      // @ts-expect-error
      expect(activeAlert1State.end).not.toBeDefined();
      // @ts-expect-error
      expect(activeAlert2State.end).not.toBeDefined();
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it has no scheduled actions', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      const recoveredAlert = new Alert<{}, {}, DefaultActionGroupId>('2');

      const originalAlerts = {
        '1': activeAlert,
        '2': recoveredAlert,
      };

      const updatedAlerts = cloneDeep(originalAlerts);

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });
      updatedAlerts['2'].setContext({ foo: '2' });

      // @ts-expect-error
      const { recoveredAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'] });
    });

    test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      const notRecoveredAlert = new Alert<{}, {}, DefaultActionGroupId>('2');

      const originalAlerts = {
        '1': activeAlert,
      };

      const updatedAlerts = {
        ...cloneDeep(originalAlerts),
        '2': notRecoveredAlert,
      };

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });

      // @ts-expect-error
      const { recoveredAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(recoveredAlerts).toEqual({});
    });

    test('updates duration in recovered alerts if start is available and adds end time', () => {
      const activeAlert = new Alert<{}, {}, DefaultActionGroupId>('1');
      const recoveredAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const recoveredAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      originalAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      originalAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(originalAlerts);

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });

      // @ts-expect-error
      const { recoveredAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

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
      const recoveredAlert1 = new Alert<{}, {}, DefaultActionGroupId>('2');
      const recoveredAlert2 = new Alert<{}, {}, DefaultActionGroupId>('3');

      const originalAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      const updatedAlerts = cloneDeep(originalAlerts);

      updatedAlerts['1'].scheduleActions('default', { foo: '1' });

      // @ts-expect-error
      const { recoveredAlerts } = processAlerts(updatedAlerts, originalAlerts);

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

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
