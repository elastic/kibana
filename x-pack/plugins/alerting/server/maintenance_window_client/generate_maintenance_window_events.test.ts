/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment-timezone';
import { Frequency } from '@kbn/rrule';
import { generateMaintenanceWindowEvents } from './generate_maintenance_window_events';

describe('generateMaintenanceWindowEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
  });

  it('should generate events for rrule repeating daily', () => {
    // Create rrule with expiration date at: 2023-03-13T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      duration: 1 * 60 * 60 * 1000,
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(2, 'weeks')
        .toISOString(),
      rRule: {
        tzid: 'UTC',
        freq: Frequency.DAILY,
        interval: 1,
        dtstart: '2023-02-27T00:00:00.000Z',
      },
    });

    expect(result.length).toEqual(15);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (daily)
    expect(result[1].gte).toEqual('2023-02-28T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-02-28T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-03-13T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-03-13T01:00:00.000Z');
  });

  it('should generate events for rrule repeating weekly', () => {
    // Create rrule with expiration date at: 2023-04-03T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      duration: 1 * 60 * 60 * 1000,
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(5, 'weeks')
        .toISOString(),
      rRule: {
        tzid: 'UTC',
        freq: Frequency.WEEKLY,
        interval: 1,
        dtstart: '2023-02-27T00:00:00.000Z',
      },
    });

    expect(result.length).toEqual(6);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (weekly)
    expect(result[1].gte).toEqual('2023-03-06T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-06T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-04-03T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-04-03T01:00:00.000Z');
  });

  it('should generate events for rrule repeating monthly', () => {
    // Create rrule with expiration date at: 2023-10-27T00:00:00.000Z
    const result = generateMaintenanceWindowEvents({
      duration: 1 * 60 * 60 * 1000,
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(8, 'months')
        .toISOString(),
      rRule: {
        tzid: 'UTC',
        freq: Frequency.MONTHLY,
        interval: 1,
        dtstart: '2023-02-27T00:00:00.000Z',
      },
    });

    expect(result.length).toEqual(9);

    // Ensure start date is correct
    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (monthly)
    expect(result[1].gte).toEqual('2023-03-27T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-27T01:00:00.000Z');

    // Ensure end date is correct
    expect(result[result.length - 1].gte).toEqual('2023-10-27T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-10-27T01:00:00.000Z');
  });

  it('should generate events for rrule repeating by specific days', () => {
    const result = generateMaintenanceWindowEvents({
      duration: 1 * 60 * 60 * 1000,
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z'))
        .tz('UTC')
        .add(5, 'weeks')
        .toISOString(),
      rRule: {
        tzid: 'UTC',
        freq: Frequency.WEEKLY,
        interval: 1,
        byweekday: ['TU', 'TH'],
        dtstart: '2023-02-27T00:00:00.000Z',
      },
    });

    expect(result.length).toEqual(10); // 5 weeks x 2 times a week = 10

    // Ensure start date is correct (Tuesday)
    expect(result[0].gte).toEqual('2023-02-28T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-28T01:00:00.000Z');

    // Ensure it is incrementing by the correct frequency (Thursday)
    expect(result[1].gte).toEqual('2023-03-02T00:00:00.000Z');
    expect(result[1].lte).toEqual('2023-03-02T01:00:00.000Z');

    // Ensure end date is correct (Thursday)
    expect(result[result.length - 1].gte).toEqual('2023-03-30T00:00:00.000Z');
    expect(result[result.length - 1].lte).toEqual('2023-03-30T01:00:00.000Z');
  });
});
