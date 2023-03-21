/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { generateMaintenanceWindowEvents } from './generate_maintenance_window_events';

describe('generateMaintenanceWindowEvents', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2023-02-27T00:00:00.000Z'));
  });

  it('should generate events', () => {
    const result = generateMaintenanceWindowEvents({
      duration: 1 * 60 * 60 * 1000,
      expirationDate: moment(new Date('2023-02-27T00:00:00.000Z')).add(5, 'weeks').toISOString(),
      rRule: {
        tzid: 'UTC',
        freq: 2,
        interval: 1,
        dtstart: '2023-02-27T00:00:00.000Z',
      },
    });

    expect(result.length).toEqual(5);

    expect(result[0].gte).toEqual('2023-02-27T00:00:00.000Z');
    expect(result[0].lte).toEqual('2023-02-27T01:00:00.000Z');

    expect(result[4].gte).toEqual('2023-03-27T00:00:00.000Z');
    expect(result[4].lte).toEqual('2023-03-27T01:00:00.000Z');
  });
});
