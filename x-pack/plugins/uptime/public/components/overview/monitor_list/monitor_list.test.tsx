/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  MonitorSummariesResult,
  CursorDirection,
  SortOrder,
  makePing,
  Ping,
  MonitorSummary,
} from '../../../../common/runtime_types';
import { MonitorListComponent, noItemsMessage } from './monitor_list';
import { renderWithRouter, shallowWithRouter } from '../../../lib';
import * as redux from 'react-redux';
import moment from 'moment';
import { IHttpFetchError } from '../../../../../../../src/core/public';
import { mockMoment } from '../../../lib/helper/test_helpers';
import { EuiThemeProvider } from '../../../../../../../src/plugins/kibana_react/common';

jest.mock('@elastic/eui/lib/services/accessibility/html_id_generator', () => {
  return {
    htmlIdGenerator: () => () => `generated-id`,
  };
});

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
    monitor: { type: 'http' },
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
    monitor: { type: 'http' },
    summaryPings: testBarPings,
    summary: {
      up: 2,
      down: 0,
    },
    timestamp: '125',
    url: {},
  },
};

describe('MonitorList component', () => {
  let localStorageMock: any;

  beforeAll(() => {
    mockMoment();
  });

  const getMonitorList = (timestamp?: string): MonitorSummariesResult => {
    if (timestamp) {
      testBarSummary.state.timestamp = timestamp;
      testFooSummary.state.timestamp = timestamp;
    } else {
      testBarSummary.state.timestamp = '125';
      testFooSummary.state.timestamp = '123';
    }
    return {
      nextPagePagination: null,
      prevPagePagination: null,
      summaries: [testFooSummary, testBarSummary],
    };
  };

  beforeEach(() => {
    const useDispatchSpy = jest.spyOn(redux, 'useDispatch');
    useDispatchSpy.mockReturnValue(jest.fn());

    const useSelectorSpy = jest.spyOn(redux, 'useSelector');
    useSelectorSpy.mockReturnValue(true);

    localStorageMock = {
      getItem: jest.fn().mockImplementation(() => '25'),
      setItem: jest.fn(),
    };

    global.localStorage = localStorageMock;
  });

  it('shallow renders the monitor list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: getMonitorList(), loading: false }}
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
      <EuiThemeProvider darkMode={false}>
        <MonitorListComponent
          monitorList={{
            list: getMonitorList(moment().subtract(5, 'minute').toISOString()),
            loading: false,
          }}
          pageSize={10}
          setPageSize={jest.fn()}
        />
      </EuiThemeProvider>
    );

    expect(component).toMatchSnapshot();
  });

  it('renders error list', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{
          list: getMonitorList(),
          error: new Error('foo message') as IHttpFetchError,
          loading: false,
        }}
        pageSize={10}
        setPageSize={jest.fn()}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('renders loading state', () => {
    const component = shallowWithRouter(
      <MonitorListComponent
        monitorList={{ list: getMonitorList(), loading: true }}
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
