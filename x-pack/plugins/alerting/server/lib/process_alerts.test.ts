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
import { AlertInstanceState, AlertInstanceContext } from '../types';
import { type Alert as AlertAsData } from '../../common';
import {
  ALERT_ACTION_GROUP,
  ALERT_DURATION,
  ALERT_FLAPPING_HISTORY,
  ALERT_ID,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';

describe('processAlerts', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  describe('process legacy alerts', () => {
    describe('newAlerts', () => {
      test('considers alert new if it has scheduled actions and its ID is not in trackedAlerts.active IDs', () => {
        const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3', {});

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(newAlerts).toEqual({ '1': newAlert });
      });

      test('if callbacks are defined, sets start time and initial duration for new alerts', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '1':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              break;
            case '2':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              break;
          }
        };

        const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');

        const trackedAlerts = {
          active: { '3': trackedActiveAlert1, '4': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert1, '2': newAlert2 },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });
      });

      test('if callbacks are defined, sets flapping history for new alerts using previously recovered alert flapping history, if it exists', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
          flappingHistory,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '1':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              // flapping history is copied from previously recovered alert '1' and updated
              expect(flappingHistory).toEqual([true, true, true, true]);
              break;
            case '2':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              // flapping history is initialized
              expect(flappingHistory).toEqual([true]);
              break;
          }
        };

        const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        // new alert '1' should copy over and update this flapping history
        trackedRecoveredAlert1.setFlappingHistory([true, true, true]);

        const trackedAlerts = {
          active: { '3': trackedActiveAlert1, '4': trackedActiveAlert2 },
          recovered: { '1': trackedRecoveredAlert1 },
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert1, '2': newAlert2 },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });
      });
    });

    describe('activeAlerts', () => {
      test('considers alert active if it has scheduled actions', () => {
        const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        // new alerts are also considered active
        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, updates duration for active (ongoing) alerts if start value is available', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              expect(start).toEqual('1969-12-30T00:00:00.000Z');
              expect(duration).toEqual('172800000000000');
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(start).toEqual('1969-12-31T07:34:00.000Z');
              expect(duration).toEqual('59160000000000');
              expect(end).not.toBeDefined();
              break;
          }
        };
        const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };
        trackedAlerts.active['2'].replaceState({
          start: '1969-12-30T00:00:00.000Z',
          duration: 33000,
        });
        trackedAlerts.active['3'].replaceState({
          start: '1969-12-31T07:34:00.000Z',
          duration: 23532,
        });

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, does not update duration for active (ongoing) alerts if start value is not available', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              expect(start).not.toBeDefined();
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(start).not.toBeDefined();
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
          }
        };
        const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, sets or updates flapping history for active (ongoing) alerts using previous active flapping history if available', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              // flapping history is copied from previous active alert '2' and updated
              expect(flappingHistory).toEqual([true, true, false, false]);
              break;
            case '3':
              // flapping history is initialized
              expect(flappingHistory).toEqual([false]);
              break;
          }
        };
        const newAlert = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };
        trackedAlerts.active['2'].setFlappingHistory([true, true, false]);

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });
    });

    describe('recoveredAlerts', () => {
      test('considers alert recovered if it is reported as recovered', () => {
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(currentRecoveredAlerts).toEqual({ '2': reportedAlerts.recovered['2'] });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, updates duration and sets end time for recovered alerts if start value is available', () => {
        const updateAlertValues = ({
          alert,
          duration,
          end,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              expect(duration).toEqual('172800000000000');
              expect(end).toEqual('1970-01-01T00:00:00.000Z');
              break;
            case '3':
              expect(duration).toEqual('59160000000000');
              expect(end).toEqual('1970-01-01T00:00:00.000Z');
              break;
          }
        };
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };
        trackedAlerts.active['2'].replaceState({
          start: '1969-12-30T00:00:00.000Z',
          duration: 33000,
        });
        trackedAlerts.active['3'].replaceState({
          start: '1969-12-31T07:34:00.000Z',
          duration: 23532,
        });

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, does not update duration or set end for recovered alerts if start value is not available', () => {
        const updateAlertValues = ({
          alert,
          duration,
          end,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
          }
        };
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };
        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, sets or updates flapping history for recovered alerts using previous recovered flapping history if available', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '2':
              expect(flappingHistory).toEqual([true, true, false, true, true]);
              break;
            case '3':
              expect(flappingHistory).toEqual([true]);
              break;
          }
        };
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };
        trackedAlerts.active['2'].setFlappingHistory([true, true, false, true]);

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('considers alert recovered if it was previously recovered and not reported as active', () => {
        const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

        const trackedAlerts = {
          active: {},
          recovered: {
            '1': previouslyRecoveredAlert1,
            '2': previouslyRecoveredAlert2,
          },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts: { active: {}, recovered: {} },
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(currentRecoveredAlerts).toEqual({});
        expect(recoveredAlerts).toEqual(trackedAlerts.recovered);
      });

      test('if callbacks are defined, sets or updates flapping history for previously recovered alerts that are still recovered', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: Alert<AlertInstanceState, AlertInstanceContext>;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert.getId()) {
            case '1':
              expect(flappingHistory).toEqual([false]);
              break;
            case '2':
              expect(flappingHistory).toEqual([false, false, true, false, true, false]);
              break;
          }
        };
        const previouslyRecoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const previouslyRecoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        previouslyRecoveredAlert2.setFlappingHistory([false, false, true, false, true]);
        const trackedAlerts = {
          active: {},
          recovered: {
            '1': previouslyRecoveredAlert1,
            '2': previouslyRecoveredAlert2,
          },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts: { active: {}, recovered: {} },
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert.getFlappingHistory() ?? [],
            getStartTime: (alert) => {
              const state = alert.getState();
              return state?.start ? (state.start as string) : undefined;
            },
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({});
        expect(recoveredAlerts).toEqual(trackedAlerts.recovered);
      });
    });

    describe('when hasReachedAlertLimit is true', () => {
      test('does not calculate recovered alerts', () => {
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
        const reportedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
        const reportedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('7');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
            '6': reportedActiveAlert1,
            '7': reportedActiveAlert2,
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { currentRecoveredAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: 7,
        });

        expect(currentRecoveredAlerts).toEqual({});
      });

      test('keeps existing active alerts active even if they are categorized as recovered', () => {
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: 7,
        });

        expect(activeAlerts).toEqual(trackedAlerts.active);
      });

      test('adds new alerts up to max allowed', () => {
        const MAX_ALERTS = 7;
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
        const reportedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
        const reportedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('7');
        const reportedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('8');
        const reportedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('9');
        const reportedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('10');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
            '6': reportedActiveAlert1,
            '7': reportedActiveAlert2,
            '8': reportedActiveAlert3,
            '9': reportedActiveAlert4,
            '10': reportedActiveAlert5,
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { activeAlerts, newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: MAX_ALERTS,
        });

        expect(Object.keys(activeAlerts).length).toEqual(MAX_ALERTS);
        expect(activeAlerts).toEqual({
          ...trackedAlerts.active,
          '6': reportedActiveAlert1,
          '7': reportedActiveAlert2,
        });
        expect(newAlerts).toEqual({
          '6': reportedActiveAlert1,
          '7': reportedActiveAlert2,
        });
      });
    });
  });

  describe('process alerts as data', () => {
    describe('newAlerts', () => {
      test('considers alert new if it has scheduled actions and its ID is not in trackedAlerts.active IDs', () => {
        const newAlert: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            ...cloneDeep(trackedAlerts.active),
            '1': newAlert,
          },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(newAlerts).toEqual({ '1': newAlert });
      });

      test('if callbacks are defined, sets start time and initial duration for new alerts', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '1':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              break;
            case '2':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              break;
          }
        };

        const newAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const newAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '4',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedAlerts = {
          active: { '3': trackedActiveAlert1, '4': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert1, '2': newAlert2 },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });
      });

      test('if callbacks are defined, sets flapping history for new alerts using previously recovered alert flapping history, if it exists', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
          flappingHistory,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '1':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              // flapping history is copied from previously recovered alert '1' and updated
              expect(flappingHistory).toEqual([true, true, true, true]);
              break;
            case '2':
              expect(start).toEqual('1970-01-01T00:00:00.000Z');
              expect(duration).toEqual('0');
              expect(end).not.toBeDefined();
              // flapping history is initialized
              expect(flappingHistory).toEqual([true]);
              break;
          }
        };

        const newAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const newAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '4',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        // new alert '1' should copy over and update this flapping history
        const trackedRecoveredAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_FLAPPING_HISTORY]: [true, true, true],
        };

        const trackedAlerts = {
          active: { '3': trackedActiveAlert1, '4': trackedActiveAlert2 },
          recovered: { '1': trackedRecoveredAlert1 },
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert1, '2': newAlert2 },
          recovered: {},
        };

        const { newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(newAlerts).toEqual({ '1': newAlert1, '2': newAlert2 });
      });
    });

    describe('activeAlerts', () => {
      test('considers alert active if it has scheduled actions', () => {
        const newAlert: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        // new alerts are also considered active
        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, updates duration for active (ongoing) alerts if start value is available', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              expect(start).toEqual('1969-12-30T00:00:00.000Z');
              expect(duration).toEqual('172800000000000');
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(start).toEqual('1969-12-31T07:34:00.000Z');
              expect(duration).toEqual('59160000000000');
              expect(end).not.toBeDefined();
              break;
          }
        };
        const newAlert: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_START]: '1969-12-30T00:00:00.000Z',
          [ALERT_DURATION]: 33000,
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_START]: '1969-12-31T07:34:00.000Z',
          [ALERT_DURATION]: 23532,
        };

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, does not update duration for active (ongoing) alerts if start value is not available', () => {
        const updateAlertValues = ({
          alert,
          start,
          duration,
          end,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              expect(start).not.toBeDefined();
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(start).not.toBeDefined();
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
          }
        };
        const newAlert: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });

      test('if callbacks are defined, sets or updates flapping history for active (ongoing) alerts using previous active flapping history if available', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              // flapping history is copied from previous active alert '2' and updated
              expect(flappingHistory).toEqual([true, true, false, false]);
              break;
            case '3':
              // flapping history is initialized
              expect(flappingHistory).toEqual([false]);
              break;
          }
        };
        const newAlert: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_FLAPPING_HISTORY]: [true, true, false],
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };

        const trackedAlerts = {
          active: { '2': trackedActiveAlert1, '3': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { ...cloneDeep(trackedAlerts.active), '1': newAlert },
          recovered: {},
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(activeAlerts).toEqual({
          '1': reportedAlerts.active['1'],
          '2': reportedAlerts.active['2'],
          '3': reportedAlerts.active['3'],
        });
      });
    });

    describe('recoveredAlerts', () => {
      test('considers alert recovered if it is reported as recovered', () => {
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_FLAPPING_HISTORY]: [true, true, false],
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(currentRecoveredAlerts).toEqual({ '2': reportedAlerts.recovered['2'] });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, updates duration and sets end time for recovered alerts if start value is available', () => {
        const updateAlertValues = ({
          alert,
          duration,
          end,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              expect(duration).toEqual('172800000000000');
              expect(end).toEqual('1970-01-01T00:00:00.000Z');
              break;
            case '3':
              expect(duration).toEqual('59160000000000');
              expect(end).toEqual('1970-01-01T00:00:00.000Z');
              break;
          }
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_START]: '1969-12-30T00:00:00.000Z',
          [ALERT_DURATION]: 33000,
        };
        const trackedActiveAlert3: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_START]: '1969-12-31T07:34:00.000Z',
          [ALERT_DURATION]: 23532,
        };

        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, does not update duration or set end for recovered alerts if start value is not available', () => {
        const updateAlertValues = ({
          alert,
          duration,
          end,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
            case '3':
              expect(duration).not.toBeDefined();
              expect(end).not.toBeDefined();
              break;
          }
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert3: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };
        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('if callbacks are defined, sets or updates flapping history for recovered alerts using previous recovered flapping history if available', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '2':
              expect(flappingHistory).toEqual([true, true, false, true, true]);
              break;
            case '3':
              expect(flappingHistory).toEqual([true]);
              break;
          }
        };
        const trackedActiveAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedActiveAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_FLAPPING_HISTORY]: [true, true, false, true],
        };
        const trackedActiveAlert3: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '3',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'active',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedAlerts = {
          active: { '1': trackedActiveAlert1, '2': trackedActiveAlert2, '3': trackedActiveAlert3 },
          recovered: {},
        };

        const reportedAlerts = {
          active: { '1': cloneDeep(trackedActiveAlert1) },
          recovered: { '2': cloneDeep(trackedActiveAlert2), '3': cloneDeep(trackedActiveAlert3) },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          trackedAlerts,
          reportedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({
          '2': reportedAlerts.recovered['2'],
          '3': reportedAlerts.recovered['3'],
        });
        expect(recoveredAlerts).toEqual(currentRecoveredAlerts);
      });

      test('considers alert recovered if it was previously recovered and not reported as active', () => {
        const previouslyRecoveredAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const previouslyRecoveredAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const trackedAlerts = {
          active: {},
          recovered: {
            '1': previouslyRecoveredAlert1,
            '2': previouslyRecoveredAlert2,
          },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts: { active: {}, recovered: {} },
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
        });

        expect(currentRecoveredAlerts).toEqual({});
        expect(recoveredAlerts).toEqual(trackedAlerts.recovered);
      });

      test('if callbacks are defined, sets or updates flapping history for previously recovered alerts that are still recovered', () => {
        const updateAlertValues = ({
          alert,
          flappingHistory,
        }: {
          alert: AlertAsData;
          start?: string;
          duration?: string;
          end?: string;
          flappingHistory: boolean[];
        }) => {
          switch (alert[ALERT_ID]) {
            case '1':
              expect(flappingHistory).toEqual([false]);
              break;
            case '2':
              expect(flappingHistory).toEqual([false, false, true, false, true, false]);
              break;
          }
        };
        const previouslyRecoveredAlert1: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '1',
          [ALERT_UUID]: 'uuid1',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
        };
        const previouslyRecoveredAlert2: AlertAsData = {
          [TIMESTAMP]: '2020-01-01T12:00:00.000Z',
          [ALERT_RULE_EXECUTION_UUID]: 'abc',
          [ALERT_RULE_UUID]: 'rule-id',
          [ALERT_ID]: '2',
          [ALERT_UUID]: 'uuid2',
          [ALERT_RULE_TYPE_ID]: 'test',
          [ALERT_RULE_CONSUMER]: 'alerts',
          [ALERT_RULE_PRODUCER]: 'apm',
          [SPACE_IDS]: ['default'],
          [ALERT_STATUS]: 'recovered',
          [ALERT_RULE_CATEGORY]: 'Test rule type',
          [ALERT_RULE_NAME]: 'test',
          [ALERT_ACTION_GROUP]: 'default',
          [ALERT_FLAPPING_HISTORY]: [false, false, true, false, true],
        };

        const trackedAlerts = {
          active: {},
          recovered: {
            '1': previouslyRecoveredAlert1,
            '2': previouslyRecoveredAlert2,
          },
        };

        const { currentRecoveredAlerts, recoveredAlerts } = processAlerts({
          reportedAlerts: { active: {}, recovered: {} },
          trackedAlerts,
          hasReachedAlertLimit: false,
          alertLimit: 10,
          callbacks: {
            getFlappingHistory: (alert) => alert[ALERT_FLAPPING_HISTORY] ?? [],
            getStartTime: (alert) => alert[ALERT_START],
            updateAlertValues,
          },
        });

        expect(currentRecoveredAlerts).toEqual({});
        expect(recoveredAlerts).toEqual(trackedAlerts.recovered);
      });
    });

    describe('when hasReachedAlertLimit is true', () => {
      test('does not calculate recovered alerts', () => {
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
        const reportedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
        const reportedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('7');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
            '6': reportedActiveAlert1,
            '7': reportedActiveAlert2,
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { currentRecoveredAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: 7,
        });

        expect(currentRecoveredAlerts).toEqual({});
      });

      test('keeps existing active alerts active even if they are categorized as recovered', () => {
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { activeAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: 7,
        });

        expect(activeAlerts).toEqual(trackedAlerts.active);
      });

      test('adds new alerts up to max allowed', () => {
        const MAX_ALERTS = 7;
        const trackedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
        const trackedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');
        const trackedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('3');
        const trackedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('4');
        const trackedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('5');
        const reportedActiveAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('6');
        const reportedActiveAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('7');
        const reportedActiveAlert3 = new Alert<AlertInstanceState, AlertInstanceContext>('8');
        const reportedActiveAlert4 = new Alert<AlertInstanceState, AlertInstanceContext>('9');
        const reportedActiveAlert5 = new Alert<AlertInstanceState, AlertInstanceContext>('10');

        const trackedAlerts = {
          active: {
            '1': trackedActiveAlert1,
            '2': trackedActiveAlert2,
            '3': trackedActiveAlert3,
            '4': trackedActiveAlert4,
            '5': trackedActiveAlert5,
          },
          recovered: {},
        };

        const reportedAlerts = {
          active: {
            '1': cloneDeep(trackedActiveAlert1),
            '2': cloneDeep(trackedActiveAlert2),
            '3': cloneDeep(trackedActiveAlert3),
            '4': cloneDeep(trackedActiveAlert4),
            '6': reportedActiveAlert1,
            '7': reportedActiveAlert2,
            '8': reportedActiveAlert3,
            '9': reportedActiveAlert4,
            '10': reportedActiveAlert5,
          },
          recovered: {
            '5': cloneDeep(trackedActiveAlert5),
          },
        };

        const { activeAlerts, newAlerts } = processAlerts({
          reportedAlerts,
          trackedAlerts,
          hasReachedAlertLimit: true,
          alertLimit: MAX_ALERTS,
        });

        expect(Object.keys(activeAlerts).length).toEqual(MAX_ALERTS);
        expect(activeAlerts).toEqual({
          ...trackedAlerts.active,
          '6': reportedActiveAlert1,
          '7': reportedActiveAlert2,
        });
        expect(newAlerts).toEqual({
          '6': reportedActiveAlert1,
          '7': reportedActiveAlert2,
        });
      });
    });
  });
});
