/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import { categorizeAlerts } from './categorize_alerts';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

describe('categorizeAlerts', () => {
  describe('newAlerts', () => {
    test('considers alert new if it has been reported as active and its id is not tracked in previous execution', () => {
      const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const existingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
      const existingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {});

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

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: updatedAlerts,
          recovered: {},
        },
        trackedAlerts: existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
      });

      expect(categorized.new).toEqual({ '1': newAlert });
    });
  });

  describe('activeAlerts', () => {
    test('considers alert ongoing if it has been reported as active and it is tracked from a previous execution', () => {
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

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: updatedAlerts,
          recovered: {},
        },
        trackedAlerts: existingAlerts,
        hasReachedAlertLimit: false,
        alertLimit: 10,
      });

      expect(categorized.ongoing).toEqual({
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
      });
    });
  });

  describe('recoveredAlerts', () => {
    test('considers alert recovered if it is reported as recovered', () => {
      const activeAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      const existingAlerts = {
        '1': activeAlert,
        '2': recoveredAlert,
      };

      const updatedAlerts = cloneDeep(existingAlerts);

      updatedAlerts['1'].scheduleActions('default' as never, { foo: '1' });
      updatedAlerts['2'].setContext({ foo: '2' });

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: {
            '1': updatedAlerts['1'],
          },
          recovered: {
            '2': updatedAlerts['2'],
          },
        },
        trackedAlerts: existingAlerts,

        hasReachedAlertLimit: false,
        alertLimit: 10,
      });

      expect(categorized.recovered).toEqual({ '2': updatedAlerts['2'] });
    });
  });

  describe('when hasReachedAlertLimit is true', () => {
    beforeEach(() => {
      jest.resetAllMocks();
    });

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

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: {
            '1': updatedAlerts['1'],
            '2': updatedAlerts['2'],
            '3': updatedAlerts['3'],
            '4': updatedAlerts['4'],
            '6': updatedAlerts['6'],
            '7': updatedAlerts['7'],
          },
          recovered: {
            '5': updatedAlerts['5'],
          },
        },
        trackedAlerts: existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: 7,
      });

      expect(categorized.recovered).toEqual({});
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

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: {
            '1': updatedAlerts['1'],
            '2': updatedAlerts['2'],
            '3': updatedAlerts['3'],
            '4': updatedAlerts['4'],
          },
          recovered: {
            '5': updatedAlerts['5'],
          },
        },
        trackedAlerts: existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: 7,
      });

      expect(categorized.ongoing).toEqual({
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

      const categorized = categorizeAlerts({
        reportedAlerts: {
          active: {
            '1': updatedAlerts['1'],
            '2': updatedAlerts['2'],
            '3': updatedAlerts['3'],
            '4': updatedAlerts['4'],
            '6': updatedAlerts['6'],
            '7': updatedAlerts['7'],
            '8': updatedAlerts['8'],
            '9': updatedAlerts['9'],
            '10': updatedAlerts['10'],
          },
          recovered: {
            '5': updatedAlerts['5'],
          },
        },
        trackedAlerts: existingAlerts,
        hasReachedAlertLimit: true,
        alertLimit: MAX_ALERTS,
      });

      expect(Object.keys(categorized.ongoing).length + Object.keys(categorized.new).length).toEqual(
        MAX_ALERTS
      );
      expect(categorized.ongoing).toEqual({
        '1': updatedAlerts['1'],
        '2': updatedAlerts['2'],
        '3': updatedAlerts['3'],
        '4': updatedAlerts['4'],
        '5': existingAlert5,
      });
      expect(categorized.new).toEqual({
        '6': newAlert6,
        '7': newAlert7,
      });
    });
  });
});
