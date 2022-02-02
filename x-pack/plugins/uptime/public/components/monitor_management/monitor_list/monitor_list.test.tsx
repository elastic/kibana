/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../lib/helper/rtl_helpers';
import { DataStream, HTTPFields, ScheduleUnit } from '../../../../common/runtime_types';
import { MonitorManagementList } from './monitor_list';
import { MonitorManagementList as MonitorManagementListState } from '../../../state/reducers/monitor_management';

describe('<ActionBar />', () => {
  const setRefresh = jest.fn();
  const setPageSize = jest.fn();
  const setPageIndex = jest.fn();
  const monitors = [];
  for (let i = 0; i < 12; i++) {
    monitors.push({
      id: `test-monitor-id-${i}`,
      attributes: {
        name: `test-monitor-${i}`,
        schedule: {
          unit: ScheduleUnit.MINUTES,
          number: `${i}`,
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

  it.each(monitors)('navigates to edit monitor flow on edit pencil', (monitor) => {
    render(
      <MonitorManagementList
        setRefresh={setRefresh}
        setPageSize={setPageSize}
        setPageIndex={setPageIndex}
        monitorList={state.monitorManagementList}
      />,
      { state }
    );

    expect(screen.getByText(monitor.attributes.name)).toBeInTheDocument();
    expect(screen.getByText(monitor.attributes.urls)).toBeInTheDocument();
    monitor.attributes.tags.forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        `@every ${monitor.attributes.schedule.number}${monitor.attributes.schedule.unit}`
      )
    ).toBeInTheDocument();
  });

  it('handles changing per page', () => {
    render(
      <MonitorManagementList
        setRefresh={setRefresh}
        setPageSize={setPageSize}
        setPageIndex={setPageIndex}
        monitorList={state.monitorManagementList}
      />,
      { state }
    );

    userEvent.click(screen.getByTestId('tablePaginationPopoverButton'));

    userEvent.click(screen.getByText('10 rows'));

    expect(setPageSize).toBeCalledWith(10);
  });

  it('handles refreshing and changing page when navigating to the next page', () => {
    render(
      <MonitorManagementList
        setRefresh={setRefresh}
        setPageSize={setPageSize}
        setPageIndex={setPageIndex}
        monitorList={state.monitorManagementList}
      />,
      { state }
    );

    userEvent.click(screen.getByTestId('pagination-button-next'));

    expect(setPageIndex).toBeCalledWith(2);
    expect(setRefresh).toBeCalledWith(true);
  });
});
