/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { prepareNewAlerts, prepareOngoingAlerts, prepareRecoveredAlerts } from './prepare_alerts';

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
        id,
        start,
        duration,
        end,
        flappingHistory,
      }: {
        id: string;
        start?: string;
        duration?: string;
        end?: string;
        flappingHistory: boolean[];
      }) => {
        expect(start).toEqual('1970-01-01T00:00:00.000Z');
        expect(duration).toEqual('0');
        expect(end).not.toBeDefined();

        switch (id) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, true]);
            break;
          case '2':
            expect(flappingHistory).toEqual([true]);
            break;
        }
      };

      prepareNewAlerts(
        ['1', '2'],
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
        id,
        start,
        duration,
        end,
        flappingHistory,
      }: {
        id: string;
        start?: string;
        duration?: string;
        end?: string;
        flappingHistory: boolean[];
      }) => {
        expect(end).not.toBeDefined();

        switch (id) {
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

      prepareOngoingAlerts(
        ['1', '2'],
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
        id,
        start,
        duration,
        end,
        flappingHistory,
      }: {
        id: string;
        start?: string;
        duration?: string;
        end?: string;
        flappingHistory: boolean[];
      }) => {
        expect(start).not.toBeDefined();
        expect(duration).not.toBeDefined();
        expect(end).not.toBeDefined();

        switch (id) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, false]);
            break;
          case '2':
            expect(flappingHistory).toEqual([false]);
            break;
        }
      };

      prepareOngoingAlerts(
        ['1', '2'],
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
        id,
        start,
        duration,
        end,
        flappingHistory,
      }: {
        id: string;
        start?: string;
        duration?: string;
        end?: string;
        flappingHistory: boolean[];
      }) => {
        expect(end).toEqual('1970-01-01T00:00:00.000Z');

        switch (id) {
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

      prepareRecoveredAlerts(
        ['1', '2'],
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
        id,
        start,
        duration,
        end,
        flappingHistory,
      }: {
        id: string;
        start?: string;
        duration?: string;
        end?: string;
        flappingHistory: boolean[];
      }) => {
        expect(start).not.toBeDefined();
        expect(duration).not.toBeDefined();
        expect(end).not.toBeDefined();

        switch (id) {
          case '1':
            expect(flappingHistory).toEqual([true, true, true, true]);
            break;
          case '2':
            expect(flappingHistory).toEqual([true]);
            break;
        }
      };

      prepareRecoveredAlerts(
        ['1', '2'],
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
