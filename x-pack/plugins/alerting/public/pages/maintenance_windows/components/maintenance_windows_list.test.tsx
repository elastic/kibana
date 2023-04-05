/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { MaintenanceWindowsList } from './maintenance_windows_list';
import { MaintenanceWindowResponse } from '../types';

describe('MaintenanceWindowsList', () => {
  const date = moment('2023-04-05').toISOString();
  const items: MaintenanceWindowResponse[] = [
    {
      id: '1',
      total: 100,
      title: 'Host maintenance',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: 'running',
      eventStartTime: date,
      eventEndTime: date,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '2',
      total: 0,
      title: 'Server outage west coast',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: 'upcoming',
      eventStartTime: date,
      eventEndTime: date,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '4',
      total: 1000,
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: 'finished',
      eventStartTime: date,
      eventEndTime: date,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
    {
      id: '5',
      total: 200,
      title: 'Monthly maintenance window',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: 'archived',
      eventStartTime: date,
      eventEndTime: date,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      createdAt: date,
      updatedAt: date,
    },
  ];
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(<MaintenanceWindowsList loading={false} items={items} />);

    expect(result.getAllByTestId('list-item')).toHaveLength(items.length);
  });
});
