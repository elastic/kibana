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
      attributes: {
        name: `test-monitor-${i}`,
        enabled: true,
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
    expect(
      screen.getByText(
        `@every ${monitor.attributes.schedule.number}${monitor.attributes.schedule.unit}`
      )
    ).toBeInTheDocument();
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

  it.skip('handles refreshing and changing page when navigating to the next page', async () => {
    render(
      <MonitorManagementList
        onUpdate={onUpdate}
        onPageStateChange={onPageStateChange}
        monitorList={state.monitorManagementList}
        pageState={pageState}
      />,
      { state }
    );

    userEvent.click(screen.getByTestId('pagination-button-next'));

    expect(onPageStateChange).toBeCalledWith(expect.objectContaining({ pageIndex: 2 }));
  });

  it.each([
    [DataStream.BROWSER, ConfigKey.SOURCE_INLINE],
    [DataStream.HTTP, ConfigKey.URLS],
    [DataStream.TCP, ConfigKey.HOSTS],
    [DataStream.ICMP, ConfigKey.HOSTS],
  ])(
    'appends inline to the monitor id for browser monitors and omits for lightweight checks',
    (type, configKey) => {
      const id = '123456';
      const name = 'sample monitor';
      const browserState = {
        monitorManagementList: {
          ...state.monitorManagementList,
          list: {
            ...state.monitorManagementList.list,
            monitors: [
              {
                id,
                attributes: {
                  name,
                  schedule: {
                    unit: ScheduleUnit.MINUTES,
                    number: '1',
                  },
                  [configKey]: 'test',
                  type,
                  tags: [`tag-1`],
                },
              },
            ],
          },
        },
      };

      render(
        <MonitorManagementList
          onUpdate={onUpdate}
          onPageStateChange={onPageStateChange}
          monitorList={browserState.monitorManagementList as unknown as MonitorManagementListState}
          pageState={{ ...pageState, pageIndex: 1 }}
        />,
        { state: browserState }
      );

      const link = screen.getByText(name) as HTMLAnchorElement;

      expect(link.href).toEqual(
        expect.stringContaining(
          `/app/uptime/monitor/${Buffer.from(
            `${id}${type === DataStream.BROWSER ? `-inline` : ''}`,
            'utf8'
          ).toString('base64')}`
        )
      );
    }
  );
});
