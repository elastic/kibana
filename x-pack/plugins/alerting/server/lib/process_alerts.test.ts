/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { cloneDeep } from 'lodash';
import { processAlerts, updateAlertFlappingHistory } from './process_alerts';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

jest.mock('uuid', () => ({
  v4: () => 'UUID1',
}));

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
    test('considers alert new if it has scheduled actions and its id is not in originalAlertIds or previouslyRecoveredAlertIds list', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {});
      const existingRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const previouslyRecoveredAlerts = {
        '4': existingRecoveredAlert1,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(newAlerts).toEqual({ '1': newAlert });
    });

    test('sets start time in new alert state', () => {
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert1,
        '2': newAlert2,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(newAlert1.getState()).toStrictEqual({});
      expect(newAlert2.getState()).toStrictEqual({});

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });

      const newAlert1State = newAlerts['1'].getState();
      const newAlert2State = newAlerts['2'].getState();

      expect(newAlert1State.start).toEqual('1970-01-01T00:00:00.000Z');
      expect(newAlert2State.start).toEqual('1970-01-01T00:00:00.000Z');

      expect(newAlert1State.duration).toEqual('0');
      expect(newAlert2State.duration).toEqual('0');

      expect(newAlert1State.end).not.toBeDefined();
      expect(newAlert2State.end).not.toBeDefined();
    });

    test('sets uuid in new alert meta', () => {
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert1,
        '2': newAlert2,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(newAlert1.getUuid()).not.toBeDefined();
      expect(newAlert2.getUuid()).not.toBeDefined();

      const { newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });

      expect(newAlert1.getUuid()).toBeDefined();
      expect(newAlert2.getUuid()).toBeDefined();
    });
  });

  describe('activeAlerts', () => {
    test('considers alert active if it has scheduled actions', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });
    });

    test('updates duration in active alerts if start is available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('does not update duration in active alerts if start is not available', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).not.toBeDefined();
      expect(activeAlert2State.start).not.toBeDefined();

      expect(activeAlert1State.duration).not.toBeDefined();
      expect(activeAlert2State.duration).not.toBeDefined();

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('preserves other state fields', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '2': existingAlert1,
        '3': existingAlert2,
      };
      existingAlerts['2'].replaceState({
        stateField1: 'xyz',
        start: '1969-12-30T00:00:00.000Z',
        duration: 33000,
      });
      existingAlerts['3'].replaceState({
        anotherState: true,
        start: '1969-12-31T07:34:00.000Z',
        duration: 23532,
      });

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '1': newAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });

      const activeAlert1State = activeAlerts['2'].getState();
      const activeAlert2State = activeAlerts['3'].getState();

      expect(activeAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(activeAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(activeAlert1State.stateField1).toEqual('xyz');
      expect(activeAlert2State.anotherState).toEqual(true);

      expect(activeAlert1State.duration).toEqual('172800000000000');
      expect(activeAlert2State.duration).toEqual('59160000000000');

      expect(activeAlert1State.end).not.toBeDefined();
      expect(activeAlert2State.end).not.toBeDefined();
    });

    test('sets start time in active alert state if alert was previously recovered', () => {
      const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const previouslyRecoveredAlerts = {
        '1': previouslyRecoveredAlert1,
        '2': previouslyRecoveredAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        ...cloneDeep(previouslyRecoveredAlerts),
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(updatedAlerts['1'].getState()).toStrictEqual({});
      expect(updatedAlerts['2'].getState()).toStrictEqual({});

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(
        Object.keys(activeAlerts).map((id) => ({ [id]: activeAlerts[id].getFlappingHistory() }))
      ).toEqual([{ '1': [true] }, { '2': [true] }, { '3': [false] }, { '4': [false] }]);

      const previouslyRecoveredAlert1State = activeAlerts['1'].getState();
      const previouslyRecoveredAlert2State = activeAlerts['2'].getState();

      expect(previouslyRecoveredAlert1State.start).toEqual('1970-01-01T00:00:00.000Z');
      expect(previouslyRecoveredAlert2State.start).toEqual('1970-01-01T00:00:00.000Z');

      expect(previouslyRecoveredAlert1State.duration).toEqual('0');
      expect(previouslyRecoveredAlert2State.duration).toEqual('0');

      expect(previouslyRecoveredAlert1State.end).not.toBeDefined();
      expect(previouslyRecoveredAlert2State.end).not.toBeDefined();
    });

    test('carries over existing active alert UUID if defined', () => {
      const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

      previouslyRecoveredAlert1.setUuid('aaaaaaa');
      previouslyRecoveredAlert2.setUuid('zzzzzzz');

      existingAlert1.setUuid('abcdefg');
      existingAlert2.setUuid('xyz1234');

      const existingAlerts = {
        '3': existingAlert1,
        '4': existingAlert2,
      };

      const previouslyRecoveredAlerts = {
        '1': previouslyRecoveredAlert1,
        '2': previouslyRecoveredAlert2,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        ...cloneDeep(previouslyRecoveredAlerts),
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });

      expect(updatedAlerts['1'].getState()).toStrictEqual({});
      expect(updatedAlerts['2'].getState()).toStrictEqual({});

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(
        Object.keys(activeAlerts).map((id) => ({ [id]: activeAlerts[id].getFlappingHistory() }))
      ).toEqual([{ '1': [true] }, { '2': [true] }, { '3': [false] }, { '4': [false] }]);

      expect(activeAlerts['1'].getUuid()).toEqual('aaaaaaa');
      expect(activeAlerts['2'].getUuid()).toEqual('zzzzzzz');
      expect(activeAlerts['3'].getUuid()).toEqual('abcdefg');
      expect(activeAlerts['4'].getUuid()).toEqual('xyz1234');
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it has no scheduled actions', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert,
      };

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].setContext({ foo: '2' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'] });
    });

    test('does not consider alert recovered if it has no actions but was not in original alerts list', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const notRecoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = {
        '1': activeAlert,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '2': notRecoveredAlert,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({});
    });

    test('updates duration in recovered alerts if start is available and adds end time', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      expect(recoveredAlert1State.start).toEqual('1969-12-30T00:00:00.000Z');
      expect(recoveredAlert2State.start).toEqual('1969-12-31T07:34:00.000Z');

      expect(recoveredAlert1State.duration).toEqual('172800000000000');
      expect(recoveredAlert2State.duration).toEqual('59160000000000');

      expect(recoveredAlert1State.end).toEqual('1970-01-01T00:00:00.000Z');
      expect(recoveredAlert2State.end).toEqual('1970-01-01T00:00:00.000Z');
    });

    test('does not update duration or set end in recovered alerts if start is not available', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      const recoveredAlert1State = recoveredAlerts['2'].getState();
      const recoveredAlert2State = recoveredAlerts['3'].getState();

      expect(recoveredAlert1State.start).not.toBeDefined();
      expect(recoveredAlert2State.start).not.toBeDefined();

      expect(recoveredAlert1State.duration).not.toBeDefined();
      expect(recoveredAlert2State.duration).not.toBeDefined();

      expect(recoveredAlert1State.end).not.toBeDefined();
      expect(recoveredAlert2State.end).not.toBeDefined();
    });

    test('considers alert recovered if it was previously recovered and not active', () => {
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const previouslyRecoveredAlerts = {
        '1': recoveredAlert1,
        '2': recoveredAlert2,
      };

      const updatedAlerts = cloneDeep(previouslyRecoveredAlerts);

      updatedAlerts['1'].setFlappingHistory([false]);
      updatedAlerts['2'].setFlappingHistory([false]);

      const { recoveredAlerts } = processAlerts({
        alerts: {},
        existingAlerts: {},
        previouslyRecoveredAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(recoveredAlerts).toEqual(updatedAlerts);
    });

    test('carries over existing active alert UUID if defined', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['1'].setUuid('1234567');
      existingAlerts['2']
        .setUuid('abcdefg')
        .replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3']
        .setUuid('xyz1234')
        .replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({ '2': updatedAlerts['2'], '3': updatedAlerts['3'] });

      expect(recoveredAlerts['2'].getUuid()).toEqual('abcdefg');
      expect(recoveredAlerts['3'].getUuid()).toEqual('xyz1234');
    });

    test('should skip recovery calculations if autoRecoverAlerts = false', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert1,
        '3': recoveredAlert2,
      };
      existingAlerts['2'].replaceState({ start: '1969-12-30T00:00:00.000Z', duration: 33000 });
      existingAlerts['3'].replaceState({ start: '1969-12-31T07:34:00.000Z', duration: 23532 });

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: false,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({});
    });
  });

  describe('when hasReachedAlertLimit is true', () => {
    test('does not calculate recovered alerts', () => {
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
      const newAlert6 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
      const newAlert7 = new Alert<AlertInstanceState, AlertInstanceContext>('7');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '6': newAlert6,
        '7': newAlert7,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"
      updatedAlerts['6'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['7'].scheduleActions('default' as never, { foo: '2' });

      const { recoveredAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: true,
        alertLimit: 7,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(recoveredAlerts).toEqual({});
    });

    test('persists existing alerts', () => {
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"

      const { activeAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: true,
        alertLimit: 7,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
        '4': updatedAlerts['4'],
        '5': existingAlert5,
      });
    });

    test('adds new alerts up to max allowed', () => {
      const MAX_ALERTS = 7;
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
      const existingAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
      const existingAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
      const newAlert6 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
      const newAlert7 = new Alert<AlertInstanceState, AlertInstanceContext>('7');
      const newAlert8 = new Alert<AlertInstanceState, AlertInstanceContext>('8');
      const newAlert9 = new Alert<AlertInstanceState, AlertInstanceContext>('9');
      const newAlert10 = new Alert<AlertInstanceState, AlertInstanceContext>('10');

      const existingAlerts = {
        '1': existingAlert1,
        '2': existingAlert2,
        '3': existingAlert3,
        '4': existingAlert4,
        '5': existingAlert5,
      };

      const updatedAlerts = {
        ...cloneDeep(existingAlerts),
        '6': newAlert6,
        '7': newAlert7,
        '8': newAlert8,
        '9': newAlert9,
        '10': newAlert10,
      };

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['3'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['4'].scheduleActions('default' as never, { foo: '2' });
      // intentionally not scheduling actions for alert "5"
      updatedAlerts['6'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['7'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['8'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['9'].scheduleActions('default' as never, { foo: '2' });
      updatedAlerts['10'].scheduleActions('default' as never, { foo: '2' });

      const { activeAlerts, newAlerts } = processAlerts({
        alerts: updatedAlerts,
        existingAlerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: true,
        alertLimit: MAX_ALERTS,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(Object.keys(activeAlerts).length).toEqual(MAX_ALERTS);
      expect(activeAlerts).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
        '4': updatedAlerts['4'],
        '5': existingAlert5,
        '6': newAlert6,
        '7': newAlert7,
      });
      expect(newAlerts).toEqual({
        '6': newAlert6,
        '7': newAlert7,
      });
    });
  });

  describe('updating flappingHistory', () => {
    test('if new alert, set flapping state to true', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');

      const alerts = cloneDeep({ '1': activeAlert });
      alerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts,
        existingAlerts: {},
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                true,
              ],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
      expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                true,
              ],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
      expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    });

    test('if alert is still active, set flapping state to false', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false] },
      });

      const alerts = cloneDeep({ '1': activeAlert });
      alerts['1'].scheduleActions('default' as never, { foo: '1' });

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts,
        existingAlerts: alerts,
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                false,
              ],
            },
            "state": Object {},
          },
        }
      `);
      expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
      expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    });

    test('if alert is active and previously recovered, set flapping state to true', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false] },
      });

      const alerts = cloneDeep({ '1': activeAlert });
      alerts['1'].scheduleActions('default' as never, { foo: '1' });
      alerts['1'].setFlappingHistory([false]);

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts,
        existingAlerts: {},
        previouslyRecoveredAlerts: { '1': recoveredAlert },
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
      expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
      expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
    });

    test('if alert is recovered and previously active, set flapping state to true', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false] },
      });
      activeAlert.scheduleActions('default' as never, { foo: '1' });
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false] },
      });

      const alerts = cloneDeep({ '1': recoveredAlert });

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts,
        existingAlerts: { '1': activeAlert },
        previouslyRecoveredAlerts: {},
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
      expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
      expect(recoveredAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                true,
              ],
            },
            "state": Object {},
          },
        }
      `);
    });

    test('if alert is still recovered, set flapping state to false', () => {
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false] },
      });

      const alerts = cloneDeep({ '1': recoveredAlert });

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts: {},
        existingAlerts: {},
        previouslyRecoveredAlerts: alerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: true,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`Object {}`);
      expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
      expect(recoveredAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
                false,
              ],
            },
            "state": Object {},
          },
        }
      `);
    });

    test('if setFlapping is false should not update flappingHistory', () => {
      const activeAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      activeAlert1.scheduleActions('default' as never, { foo: '1' });
      const activeAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2', {
        meta: { flappingHistory: [false] },
      });
      activeAlert2.scheduleActions('default' as never, { foo: '1' });
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('3', {
        meta: { flappingHistory: [false] },
      });

      const previouslyRecoveredAlerts = cloneDeep({ '3': recoveredAlert });
      const alerts = cloneDeep({ '1': activeAlert1, '2': activeAlert2 });
      const existingAlerts = cloneDeep({ '2': activeAlert2 });

      const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
        alerts,
        existingAlerts,
        previouslyRecoveredAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
        autoRecoverAlerts: true,
        setFlapping: false,
      });

      expect(activeAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
          "2": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
              ],
            },
            "state": Object {},
          },
        }
      `);
      expect(newAlerts).toMatchInlineSnapshot(`
        Object {
          "1": Object {
            "meta": Object {
              "flappingHistory": Array [],
              "uuid": "UUID1",
            },
            "state": Object {
              "duration": "0",
              "start": "1970-01-01T00:00:00.000Z",
            },
          },
        }
      `);
      expect(recoveredAlerts).toMatchInlineSnapshot(`
        Object {
          "3": Object {
            "meta": Object {
              "flappingHistory": Array [
                false,
              ],
            },
            "state": Object {},
          },
        }
      `);
    });

    describe('when hasReachedAlertLimit is true', () => {
      test('if alert is still active, set flapping state to false', () => {
        const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
          meta: { flappingHistory: [false] },
        });

        const alerts = cloneDeep({ '1': activeAlert });
        alerts['1'].scheduleActions('default' as never, { foo: '1' });

        const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
          alerts,
          existingAlerts: alerts,
          previouslyRecoveredAlerts: {},
          hasReachedAlertLimit: true,
          alertLimit: 10,
          autoRecoverAlerts: true,
          setFlapping: true,
        });

        expect(activeAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flappingHistory": Array [
                  false,
                  false,
                ],
              },
              "state": Object {},
            },
          }
        `);
        expect(newAlerts).toMatchInlineSnapshot(`Object {}`);
        expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
      });

      test('if new alert, set flapping state to true', () => {
        const activeAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
          meta: { flappingHistory: [false] },
        });
        activeAlert1.scheduleActions('default' as never, { foo: '1' });
        const activeAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        activeAlert2.scheduleActions('default' as never, { foo: '1' });

        const alerts = cloneDeep({ '1': activeAlert1, '2': activeAlert2 });

        const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
          alerts,
          existingAlerts: { '1': activeAlert1 },
          previouslyRecoveredAlerts: {},
          hasReachedAlertLimit: true,
          alertLimit: 10,
          autoRecoverAlerts: true,
          setFlapping: true,
        });

        expect(activeAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flappingHistory": Array [
                  false,
                  false,
                ],
              },
              "state": Object {},
            },
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(newAlerts).toMatchInlineSnapshot(`
          Object {
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
      });

      test('if alert is active and previously recovered, set flapping state to true', () => {
        const activeAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
          meta: { flappingHistory: [false] },
        });
        activeAlert1.scheduleActions('default' as never, { foo: '1' });
        const activeAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        activeAlert2.scheduleActions('default' as never, { foo: '1' });

        const alerts = cloneDeep({ '1': activeAlert1, '2': activeAlert2 });

        const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
          alerts,
          existingAlerts: {},
          previouslyRecoveredAlerts: { '1': activeAlert1 },
          hasReachedAlertLimit: true,
          alertLimit: 10,
          autoRecoverAlerts: true,
          setFlapping: true,
        });

        expect(activeAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flappingHistory": Array [
                  false,
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(newAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flappingHistory": Array [
                  false,
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [
                  true,
                ],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
      });

      test('if setFlapping is false should not update flappingHistory', () => {
        const activeAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
          meta: { flappingHistory: [false] },
        });
        activeAlert1.scheduleActions('default' as never, { foo: '1' });
        const activeAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        activeAlert2.scheduleActions('default' as never, { foo: '1' });

        const alerts = cloneDeep({ '1': activeAlert1, '2': activeAlert2 });

        const { activeAlerts, newAlerts, recoveredAlerts } = processAlerts({
          alerts,
          existingAlerts: { '1': activeAlert1 },
          previouslyRecoveredAlerts: {},
          hasReachedAlertLimit: true,
          alertLimit: 10,
          autoRecoverAlerts: true,
          setFlapping: false,
        });

        expect(activeAlerts).toMatchInlineSnapshot(`
          Object {
            "1": Object {
              "meta": Object {
                "flappingHistory": Array [
                  false,
                ],
              },
              "state": Object {},
            },
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(newAlerts).toMatchInlineSnapshot(`
          Object {
            "2": Object {
              "meta": Object {
                "flappingHistory": Array [],
                "uuid": "UUID1",
              },
              "state": Object {
                "duration": "0",
                "start": "1970-01-01T00:00:00.000Z",
              },
            },
          }
        `);
        expect(recoveredAlerts).toMatchInlineSnapshot(`Object {}`);
      });
    });
  });

  describe('updateAlertFlappingHistory function', () => {
    test('correctly updates flappingHistory', () => {
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory: [false, false] },
      });
      updateAlertFlappingHistory(alert, true);
      expect(alert.getFlappingHistory()).toEqual([false, false, true]);
    });

    test('correctly updates flappingHistory while maintaining a fixed size', () => {
      const flappingHistory = new Array(20).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory },
      });
      updateAlertFlappingHistory(alert, true);
      const fh = alert.getFlappingHistory() || [];
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });

    test('correctly updates flappingHistory while maintaining if array is larger than fixed size', () => {
      const flappingHistory = new Array(23).fill(false);
      const alert = new Alert<AlertInstanceState, AlertInstanceContext>('1', {
        meta: { flappingHistory },
      });
      updateAlertFlappingHistory(alert, true);
      const fh = alert.getFlappingHistory() || [];
      expect(fh.length).toEqual(20);
      const result = new Array(19).fill(false);
      expect(fh).toEqual(result.concat(true));
    });
  });
});
