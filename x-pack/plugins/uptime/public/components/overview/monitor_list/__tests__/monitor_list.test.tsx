/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  MonitorSummaryResult,
  CursorDirection,
  SortOrder,
} from '../../../../../common/runtime_types';
import { MonitorListComponent } from '../monitor_list';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import * as redux from 'react-redux';

describe('MonitorList component', () => {
  let result: MonitorSummaryResult;
  let localStorageMock: any;

  beforeEach(() => {
    const useDispatchSpy = jest.spyOn(redux, 'useDispatch');
    useDispatchSpy.mockReturnValue(jest.fn());

    const useSelectorSpy = jest.spyOn(redux, 'useSelector');
    useSelectorSpy.mockReturnValue(true);

    localStorageMock = {
      getItem: jest.fn().mockImplementation(() => '25'),
      setItem: jest.fn(),
    };

    // @ts-ignore replacing a call to localStorage we use for monitor list size
    global.localStorage = localStorageMock;
    result = {
      nextPagePagination: null,
      prevPagePagination: null,
      summaries: [
        {
          monitor_id: 'foo',
          state: {
            checks: [
              {
                monitor: {
                  ip: '127.0.0.1',
                  status: 'up',
                },
                timestamp: 124,
              },
              {
                monitor: {
                  ip: '127.0.0.2',
                  status: 'down',
                },
                timestamp: 125,
              },
              {
                monitor: {
                  ip: '127.0.0.3',
                  status: 'down',
                },
                timestamp: 126,
              },
            ],
            summary: {
              up: 1,
              down: 2,
            },
            timestamp: '123',
            url: {},
          },
        },
        {
          monitor_id: 'bar',
          state: {
            checks: [
              {
                monitor: {
                  ip: '127.0.0.1',
                  status: 'up',
                },
                timestamp: 125,
              },
              {
                monitor: {
                  ip: '127.0.0.2',
                  status: 'up',
                },
                timestamp: 126,
              },
            ],
            summary: {
              up: 2,
              down: 0,
            },
            timestamp: '125',
            url: {},
          },
        },
      ],
      totalSummaryCount: 2,
    };
  });

  it('shallow renders the monitor list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: false }}
        lastRefresh={123}
        getMonitorList={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders a no items message when no data is provided', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{
          list: {
            summaries: [],
            nextPagePagination: null,
            prevPagePagination: null,
            totalSummaryCount: 0,
          },
          loading: true,
        }}
        lastRefresh={123}
        getMonitorList={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders the monitor list', () => {
    const component = renderWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: false }}
        lastRefresh={123}
        getMonitorList={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders error list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, error: new Error('foo message'), loading: false }}
        lastRefresh={123}
        getMonitorList={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: true }}
        lastRefresh={123}
        getMonitorList={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('MonitorListPagination component', () => {
    let paginationResult: MonitorSummaryResult;

    beforeEach(() => {
      paginationResult = {
        prevPagePagination: JSON.stringify({
          cursorKey: { monitor_id: 123 },
          cursorDirection: CursorDirection.BEFORE,
          sortOrder: SortOrder.ASC,
        }),
        nextPagePagination: JSON.stringify({
          cursorKey: { monitor_id: 456 },
          cursorDirection: CursorDirection.AFTER,
          sortOrder: SortOrder.ASC,
        }),
        summaries: [
          {
            monitor_id: 'foo',
            state: {
              checks: [
                {
                  monitor: {
                    ip: '127.0.0.1',
                    status: 'up',
                  },
                  timestamp: 124,
                },
                {
                  monitor: {
                    ip: '127.0.0.2',
                    status: 'down',
                  },
                  timestamp: 125,
                },
                {
                  monitor: {
                    ip: '127.0.0.3',
                    status: 'down',
                  },
                  timestamp: 126,
                },
              ],
              summary: {
                up: 1,
                down: 2,
              },
              timestamp: '123',
              url: {},
            },
          },
          {
            monitor_id: 'bar',
            state: {
              checks: [
                {
                  monitor: {
                    ip: '127.0.0.1',
                    status: 'up',
                  },
                  timestamp: 125,
                },
                {
                  monitor: {
                    ip: '127.0.0.2',
                    status: 'up',
                  },
                  timestamp: 126,
                },
              ],
              summary: {
                up: 2,
                down: 0,
              },
              timestamp: '125',
              url: {},
            },
          },
        ],
        totalSummaryCount: 2,
      };
    });

    it('renders the pagination', () => {
      const component = shallowWithRouter(
        <MonitorListComponent
          monitorList={{
            list: {
              ...paginationResult,
            },
            loading: false,
          }}
          lastRefresh={123}
          getMonitorList={jest.fn()}
        />
      );

      expect(component).toMatchSnapshot();
    });

    it('renders a no items message when no data is provided', () => {
      const component = shallowWithRouter(
        <MonitorListComponent
          monitorList={{
            list: {
              summaries: [],
              nextPagePagination: null,
              prevPagePagination: null,
              totalSummaryCount: 0,
            },
            loading: false,
          }}
          lastRefresh={123}
          getMonitorList={jest.fn()}
        />
      );

      expect(component).toMatchSnapshot();
    });
  });
});
