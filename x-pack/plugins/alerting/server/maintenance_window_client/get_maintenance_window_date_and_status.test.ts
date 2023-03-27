/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findRecentEventWithStatus } from './get_maintenance_window_date_and_status';
import { DateRange, MaintenanceWindowStatus } from '../../common';

const events: DateRange[] = [
  {
    gte: '2023-03-25T00:00:00.000Z',
    lte: '2023-03-25T01:00:00.000Z',
  },
  {
    gte: '2023-03-26T00:00:00.000Z',
    lte: '2023-03-26T01:00:00.000Z',
  },
  {
    gte: '2023-03-27T00:00:00.000Z',
    lte: '2023-03-27T01:00:00.000Z',
  },
  {
    gte: '2023-03-28T00:00:00.000Z',
    lte: '2023-03-28T01:00:00.000Z',
  },
  {
    gte: '2023-03-29T00:00:00.000Z',
    lte: '2023-03-29T01:00:00.000Z',
  },
  {
    gte: '2023-03-30T00:00:00.000Z',
    lte: '2023-03-30T01:00:00.000Z',
  },
  {
    gte: '2023-03-31T00:00:00.000Z',
    lte: '2023-03-31T01:00:00.000Z',
  },
];

describe('findRecentEventWithStatus', () => {
  it('should find the status if event is running', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-25T00:30:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-25T00:00:00.000Z',
        lte: '2023-03-25T01:00:00.000Z',
      },
      index: 0,
      status: MaintenanceWindowStatus.Running,
    });

    jest.useFakeTimers().setSystemTime(new Date('2023-03-27T00:30:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-27T00:00:00.000Z',
        lte: '2023-03-27T01:00:00.000Z',
      },
      index: 2,
      status: MaintenanceWindowStatus.Running,
    });

    jest.useFakeTimers().setSystemTime(new Date('2023-03-29T00:30:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-29T00:00:00.000Z',
        lte: '2023-03-29T01:00:00.000Z',
      },
      index: 4,
      status: MaintenanceWindowStatus.Running,
    });

    jest.useFakeTimers().setSystemTime(new Date('2023-03-30T00:30:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-30T00:00:00.000Z',
        lte: '2023-03-30T01:00:00.000Z',
      },
      index: 5,
      status: MaintenanceWindowStatus.Running,
    });
  });

  it('should find the status if event is upcoming', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-03-24T05:00:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-25T00:00:00.000Z',
        lte: '2023-03-25T01:00:00.000Z',
      },
      index: 0,
      status: MaintenanceWindowStatus.Upcoming,
    });

    jest.useFakeTimers().setSystemTime(new Date('2023-03-26T05:00:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-27T00:00:00.000Z',
        lte: '2023-03-27T01:00:00.000Z',
      },
      index: 2,
      status: MaintenanceWindowStatus.Upcoming,
    });
    jest.useFakeTimers().setSystemTime(new Date('2023-03-27T05:00:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-28T00:00:00.000Z',
        lte: '2023-03-28T01:00:00.000Z',
      },
      index: 3,
      status: MaintenanceWindowStatus.Upcoming,
    });
    jest.useFakeTimers().setSystemTime(new Date('2023-03-29T05:00:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-30T00:00:00.000Z',
        lte: '2023-03-30T01:00:00.000Z',
      },
      index: 5,
      status: MaintenanceWindowStatus.Upcoming,
    });
  });

  it('should find the status if event is finished', () => {
    jest.useFakeTimers().setSystemTime(new Date('2023-04-01T05:00:00.000Z'));
    expect(findRecentEventWithStatus(events, new Date())).toEqual({
      event: {
        gte: '2023-03-31T00:00:00.000Z',
        lte: '2023-03-31T01:00:00.000Z',
      },
      index: 6,
      status: MaintenanceWindowStatus.Finished,
    });
  });
});
