/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  MonitorSummariesResult,
  CursorDirection,
  SortOrder,
  makePing,
  Ping,
  MonitorSummary,
} from '../../../../../common/runtime_types';
import { MonitorListComponent, noItemsMessage } from '../monitor_list';
import { renderWithRouter, shallowWithRouter } from '../../../../lib';
import * as redux from 'react-redux';

const testFooPings: Ping[] = [
  makePing({
    docId: 'foo1',
    id: 'foo',
    type: 'icmp',
    status: 'up',
    duration: 123,
    timestamp: '124',
    ip: '127.0.0.1',
  }),
  makePing({
    docId: 'foo2',
    id: 'foo',
    type: 'icmp',
    status: 'up',
    duration: 123,
    timestamp: '125',
    ip: '127.0.0.2',
  }),
  makePing({
    docId: 'foo3',
    id: 'foo',
    type: 'icmp',
    status: 'down',
    duration: 123,
    timestamp: '126',
    ip: '127.0.0.3',
  }),
];

const testFooSummary: MonitorSummary = {
  monitor_id: 'foo',
  state: {
    monitor: {},
    summaryPings: testFooPings,
    summary: {
      up: 1,
      down: 2,
    },
    timestamp: '123',
    url: {},
  },
};

const testBarPings: Ping[] = [
  makePing({
    docId: 'bar1',
    id: 'bar',
    type: 'icmp',
    status: 'down',
    duration: 123,
    timestamp: '125',
    ip: '127.0.0.1',
  }),
  makePing({
    docId: 'bar2',
    id: 'bar',
    type: 'icmp',
    status: 'down',
    duration: 123,
    timestamp: '126',
    ip: '127.0.0.1',
  }),
];

const testBarSummary: MonitorSummary = {
  monitor_id: 'bar',
  state: {
    monitor: {},
    summaryPings: testBarPings,
    summary: {
      up: 2,
      down: 0,
    },
    timestamp: '125',
    url: {},
  },
};

// Failing: See https://github.com/elastic/kibana/issues/70386
describe.skip('MonitorList component', () => {
  let result: MonitorSummariesResult;
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
      summaries: [testFooSummary, testBarSummary],
      totalSummaryCount: 2,
    };
  });

  it('shallow renders the monitor list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: false }}
        pageSize={10}
        setPageSize={jest.fn()}
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
        pageSize={10}
        setPageSize={jest.fn()}
      />
    );
    expect(component).toMatchSnapshot();
  });

  it('renders the monitor list', () => {
    const component = renderWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: false }}
        pageSize={10}
        setPageSize={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders error list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, error: new Error('foo message'), loading: false }}
        pageSize={10}
        setPageSize={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: result, loading: true }}
        pageSize={10}
        setPageSize={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  describe('MonitorListPagination component', () => {
    let paginationResult: MonitorSummariesResult;

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
        summaries: [testFooSummary, testBarSummary],
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
          pageSize={10}
          setPageSize={jest.fn()}
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
          pageSize={10}
          setPageSize={jest.fn()}
        />
      );

      expect(component).toMatchSnapshot();
    });
  });

  describe('noItemsMessage', () => {
    it('returns loading message while loading', () => {
      expect(noItemsMessage(true)).toEqual(`Loading...`);
    });

    it('returns loading message when filters are defined and loading', () => {
      expect(noItemsMessage(true, 'filters')).toEqual(`Loading...`);
    });

    it('returns no monitors selected when filters are defined and not loading', () => {
      expect(noItemsMessage(false, 'filters')).toEqual(
        `No monitors found for selected filter criteria`
      );
    });

    it('returns no data message when no filters and not loading', () => {
      expect(noItemsMessage(false)).toEqual(`No uptime monitors found`);
    });
  });
});
