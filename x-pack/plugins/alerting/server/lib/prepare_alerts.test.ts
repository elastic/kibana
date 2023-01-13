/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { prepareNewAlerts, prepareOngoingAlerts, prepareRecoveredAlerts } from './prepare_alerts';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

describe('prepareAlerts', () => {
  let clock: sinon.SinonFakeTimers;

  beforeAll(() => {
    clock = sinon.useFakeTimers();
  });

  beforeEach(() => {
    clock.reset();
  });

  afterAll(() => clock.restore());

  describe('prepareNewAlerts', () => {
    test('returns start time, duration and updated flapping history', () => {
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
        expect(start).toEqual('1970-01-01T00:00:00.000Z');
        expect(duration).toEqual('0');
        expect(end).not.toBeDefined();

        switch (alert.getId()) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, true]);
            break;
          case '2':
            expect(flappingHistory).toEqual([true]);
            break;
        }
      };
      const newAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const newAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      newAlert1.scheduleActions('default' as never, { foo: '1' });
      newAlert2.scheduleActions('default' as never, { foo: '1' });

      prepareNewAlerts<Alert<AlertInstanceState, AlertInstanceContext>>(
        {
          '1': newAlert1,
          '2': newAlert2,
        },
        {
          '1': [true, true, true],
        },
        updateAlertValues
      );
    });
  });

  describe('prepareOngoingAlerts', () => {
    test('returns updated flapping history updated duration if start is available', () => {
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
        expect(end).not.toBeDefined();

        switch (alert.getId()) {
          case '1':
            expect(start).toEqual('1969-12-30T00:00:00.000Z');
            expect(duration).toEqual('172800000000000');
            expect(flappingHistory).toEqual([true, true, true, false]);
            break;
          case '2':
            expect(start).toEqual('1969-12-31T07:34:00.000Z');
            expect(duration).toEqual('59160000000000');
            expect(flappingHistory).toEqual([false]);
            break;
        }
      };
      const ongoingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const ongoingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      ongoingAlert1
        .replaceState({ start: '1969-12-30T00:00:00.000Z', duration: '0' })
        .scheduleActions('default' as never, { foo: '1' });
      ongoingAlert2
        .replaceState({ start: '1969-12-31T07:34:00.000Z', duration: '0' })
        .scheduleActions('default' as never, { foo: '1' });

      prepareOngoingAlerts<Alert<AlertInstanceState, AlertInstanceContext>>(
        {
          '1': ongoingAlert1,
          '2': ongoingAlert2,
        },
        {
          '1': '1969-12-30T00:00:00.000Z',
          '2': '1969-12-31T07:34:00.000Z',
        },
        {
          '1': [true, true, true],
        },
        updateAlertValues
      );
    });

    test('only returns updated flapping history when start is not available', () => {
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
        expect(start).not.toBeDefined();
        expect(duration).not.toBeDefined();
        expect(end).not.toBeDefined();

        switch (alert.getId()) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, false]);
            break;
          case '2':
            expect(flappingHistory).toEqual([false]);
            break;
        }
      };
      const ongoingAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const ongoingAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      ongoingAlert1.scheduleActions('default' as never, { foo: '1' });
      ongoingAlert2.scheduleActions('default' as never, { foo: '1' });

      prepareOngoingAlerts<Alert<AlertInstanceState, AlertInstanceContext>>(
        {
          '1': ongoingAlert1,
          '2': ongoingAlert2,
        },
        {
          '1': undefined,
          '2': undefined,
        },
        {
          '1': [true, true, true],
        },
        updateAlertValues
      );
    });
  });

  describe('prepareRecoveredAlerts', () => {
    test('returns updated flapping history, updated duration and end if start is available', () => {
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
        expect(end).toEqual('1970-01-01T00:00:00.000Z');

        switch (alert.getId()) {
          case '1':
            expect(start).toEqual('1969-12-30T00:00:00.000Z');
            expect(duration).toEqual('172800000000000');
            expect(flappingHistory).toEqual([true, true, true, true]);
            break;
          case '2':
            expect(start).toEqual('1969-12-31T07:34:00.000Z');
            expect(duration).toEqual('59160000000000');
            expect(flappingHistory).toEqual([true]);
            break;
        }
      };
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      recoveredAlert1
        .replaceState({ start: '1969-12-30T00:00:00.000Z', duration: '0' })
        .scheduleActions('default' as never, { foo: '1' });
      recoveredAlert2
        .replaceState({ start: '1969-12-31T07:34:00.000Z', duration: '0' })
        .scheduleActions('default' as never, { foo: '1' });

      prepareRecoveredAlerts<Alert<AlertInstanceState, AlertInstanceContext>>(
        {
          '1': recoveredAlert1,
          '2': recoveredAlert2,
        },
        {
          '1': '1969-12-30T00:00:00.000Z',
          '2': '1969-12-31T07:34:00.000Z',
        },
        {
          '1': [true, true, true],
        },
        updateAlertValues
      );
    });

    test('only returns updated flapping history when start is not available', () => {
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
        expect(start).not.toBeDefined();
        expect(duration).not.toBeDefined();
        expect(end).not.toBeDefined();

        switch (alert.getId()) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, true]);
            break;
          case '2':
            expect(flappingHistory).toEqual([true]);
            break;
        }
      };
      const recoveredAlert1 = new Alert<AlertInstanceState, AlertInstanceContext>('1');
      const recoveredAlert2 = new Alert<AlertInstanceState, AlertInstanceContext>('2');

      recoveredAlert1.scheduleActions('default' as never, { foo: '1' });
      recoveredAlert2.scheduleActions('default' as never, { foo: '1' });

      prepareRecoveredAlerts<Alert<AlertInstanceState, AlertInstanceContext>>(
        {
          '1': recoveredAlert1,
          '2': recoveredAlert2,
        },
        {
          '1': undefined,
          '2': undefined,
        },
        {
          '1': [true, true, true],
        },
        updateAlertValues
      );
    });
  });
});
