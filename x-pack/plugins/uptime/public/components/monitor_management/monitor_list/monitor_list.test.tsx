/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { ConfigKey, DataStream, HTTPFields, ScheduleUnit } from '../../../../common/runtime_types';
import { render } from '../../../lib/helper/rtl_helpers';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';
import { MonitorManagementList, MonitorManagementListPageState } from './monitor_list';

describe('<MonitorManagementList />', () => {
  const onUpdate = jest.fn();
  const onPageStateChange = jest.fn();
  const monitors = [];
  for (let i = 0; i < 12; i++) {
    monitors.push({
      id: `test-monitor-id-${i}`,
      updated_at: '123',
      attributes: {
        name: `test-monitor-${i}`,
        enabled: true,
        schedule: {
          unit: ScheduleUnit.MINUTES,
          number: `${i * 10}`,
        },
        urls: `https://test-${i}.co`,
        type: DataStream.HTTP,
        tags: [`tag-${i}`],
      } as HTTPFields,
    });
  }
  const state = {
    monitorManagementList: {
      list: {
        perPage: 5,
        page: 1,
        total: 6,
        monitors,
      },
      locations: [],
      error: {
        serviceLocations: null,
        monitorList: null,
      },
      loading: {
        monitorList: true,
        serviceLocations: false,
      },
    } as MonitorManagementListState,
  };

  const pageState: MonitorManagementListPageState = {
    pageIndex: 1,
    pageSize: 10,
    sortField: ConfigKey.NAME,
    sortOrder: 'asc',
  };

  it.each(monitors)('navigates to edit monitor flow on edit pencil', (monitor) => {
    render(
      <MonitorManagementList
        onUpdate={onUpdate}
        onPageStateChange={onPageStateChange}
        monitorList={state.monitorManagementList}
        pageState={pageState}
      />,
      { state }
    );

    expect(screen.getByText(monitor.attributes.name)).toBeInTheDocument();
    expect(screen.getByText(monitor.attributes.urls)).toBeInTheDocument();
    monitor.attributes.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
    expect(screen.getByText(monitor.attributes.schedule.number)).toBeInTheDocument();
  });

  it('handles changing per page', () => {
    render(
      <MonitorManagementList
        onUpdate={onUpdate}
        onPageStateChange={onPageStateChange}
        monitorList={state.monitorManagementList}
        pageState={pageState}
      />,
      { state }
    );

    userEvent.click(screen.getByTestId('tablePaginationPopoverButton'));

    userEvent.click(screen.getByText('10 rows'));

    expect(onPageStateChange).toBeCalledWith(expect.objectContaining({ pageSize: 10 }));
  });

  it('handles refreshing and changing page when navigating to the next page', async () => {
    const { getByTestId } = render(
      <MonitorManagementList
        onUpdate={onUpdate}
        onPageStateChange={onPageStateChange}
        monitorList={state.monitorManagementList}
        pageState={{ ...pageState, pageSize: 3, pageIndex: 1 }}
      />,
      { state }
    );

    userEvent.click(getByTestId('pagination-button-next'));

    expect(onPageStateChange).toBeCalledWith(expect.objectContaining({ pageIndex: 2 }));
  });
});
