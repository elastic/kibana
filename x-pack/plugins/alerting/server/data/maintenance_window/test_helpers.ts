/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Frequency } from '@kbn/rrule';
import { MaintenanceWindowAttributes } from './types';

export const getMockMaintenanceWindow = (
  overwrites?: Partial<MaintenanceWindowAttributes>
): MaintenanceWindowAttributes => {
  return {
    title: 'test-title',
    duration: 60 * 60 * 1000,
    enabled: true,
    rRule: {
      tzid: 'UTC',
      dtstart: '2023-02-26T00:00:00.000Z',
      freq: Frequency.WEEKLY,
      count: 2,
    } as MaintenanceWindowAttributes['rRule'],
    events: [
      {
        gte: '2023-02-26T00:00:00.000Z',
        lte: '2023-02-26T01:00:00.000Z',
      },
      {
        gte: '2023-03-05T00:00:00.000Z',
        lte: '2023-03-05T01:00:00.000Z',
      },
    ],
    createdAt: '2023-02-26T00:00:00.000Z',
    updatedAt: '2023-02-26T00:00:00.000Z',
    createdBy: 'test-user',
    updatedBy: 'test-user',
    expirationDate: new Date().toISOString(),
    ...overwrites,
  };
};
