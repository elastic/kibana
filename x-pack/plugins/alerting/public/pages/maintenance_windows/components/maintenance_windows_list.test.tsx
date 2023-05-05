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
import { MaintenanceWindowFindResponse } from '../types';
import { MaintenanceWindowStatus } from '../../../../common';

describe('MaintenanceWindowsList', () => {
  const date = moment('2023-04-05').toISOString();
  const endDate = moment('2023-04-05').add(1, 'month').toISOString();
  const items: MaintenanceWindowFindResponse[] = [
    {
      id: '1',
      total: 100,
      title: 'Host maintenance',
      enabled: true,
      duration: 1,
      expirationDate: date,
      events: [],
      rRule: { dtstart: date, tzid: 'UTC' },
      status: MaintenanceWindowStatus.Running,
      eventStartTime: date,
      eventEndTime: endDate,
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
      status: MaintenanceWindowStatus.Upcoming,
      eventStartTime: date,
      eventEndTime: endDate,
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
      status: MaintenanceWindowStatus.Finished,
      eventStartTime: date,
      eventEndTime: endDate,
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
      status: MaintenanceWindowStatus.Archived,
      eventStartTime: date,
      eventEndTime: endDate,
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
    const result = appMockRenderer.render(
      <MaintenanceWindowsList
        refreshData={() => {}}
        loading={false}
        items={items}
        readOnly={false}
      />
    );

    expect(result.getAllByTestId('list-item')).toHaveLength(items.length);

    // check the title
    expect(result.getAllByText('Host maintenance')).toHaveLength(1);
    expect(result.getAllByText('Server outage west coast')).toHaveLength(1);
    expect(result.getAllByText('Monthly maintenance window')).toHaveLength(2);

    // check the status
    expect(result.getAllByText('Running')).toHaveLength(1);
    expect(result.getAllByText('Upcoming')).toHaveLength(1);
    expect(result.getAllByText('Finished')).toHaveLength(1);
    expect(result.getAllByText('Archived')).toHaveLength(1);

    // check the startDate formatting
    expect(result.getAllByText('04/05/23 12:00 AM')).toHaveLength(4);

    // check the endDate formatting
    expect(result.getAllByText('05/05/23 12:00 AM')).toHaveLength(4);

    // check if action menu is there
    expect(result.getAllByTestId('table-actions-icon-button')).toHaveLength(items.length);
  });

  test('it does NOT renders action column in readonly', () => {
    const result = appMockRenderer.render(
      <MaintenanceWindowsList
        refreshData={() => {}}
        loading={false}
        items={items}
        readOnly={true}
      />
    );

    expect(result.getAllByTestId('list-item')).toHaveLength(items.length);

    // check if action menu is there
    expect(result.queryByTestId('table-actions-icon-button')).not.toBeInTheDocument();
  });
});
