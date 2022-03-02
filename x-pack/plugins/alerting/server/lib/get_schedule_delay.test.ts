/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import sinon from 'sinon';
import { getScheduleDelay } from './get_schedule_delay';

let clock: sinon.SinonFakeTimers;
describe('getScheduleDelay', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(moment.utc([2000, 1, 1, 0, 0, 0, 0]).valueOf());
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  test('uses task runAt if retryAt is null', () => {
    const runAt = '2022-03-01T11:40:00.000Z';
    expect(
      // @ts-ignore
      getScheduleDelay(new Date('2022-03-01T12:00:00.000Z'), {
        retryAt: null,
        runAt: new Date(runAt),
      })
    ).toEqual({
      scheduleDelay: 1200000000000,
      scheduled: runAt,
    });
  });

  test('uses task runAt if retryAt is in the future', () => {
    const runAt = '2022-03-01T11:40:00.000Z';
    expect(
      // @ts-ignore
      getScheduleDelay(new Date('2022-03-01T12:00:00.000Z'), {
        retryAt: new Date('2022-03-01T12:05:00.000Z'),
        runAt: new Date(runAt),
      })
    ).toEqual({
      scheduleDelay: 1200000000000,
      scheduled: runAt,
    });
  });

  test('uses task retryAt if retryAt is in the past', () => {
    const runAt = '2022-03-01T11:40:00.000Z';
    const retryAt = '2022-03-01T11:50:00.000Z';
    expect(
      // @ts-ignore
      getScheduleDelay(new Date('2022-03-01T12:00:00.000Z'), {
        retryAt: new Date(retryAt),
        runAt: new Date(runAt),
      })
    ).toEqual({
      scheduleDelay: 600000000000,
      scheduled: retryAt,
    });
  });
});
