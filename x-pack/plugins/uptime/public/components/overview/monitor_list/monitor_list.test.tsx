/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import {
  MonitorSummariesResult,
  CursorDirection,
  SortOrder,
  makePing,
  Ping,
  MonitorSummary,
} from '../../../../common/runtime_types';
import { MonitorListComponent, noItemsMessage } from './monitor_list';
import moment from 'moment';
import { IHttpFetchError, ResponseErrorBody } from '../../../../../../../src/core/public';
import { mockMoment } from '../../../lib/helper/test_helpers';
import { render } from '../../../lib/helper/rtl_helpers';
import { NO_DATA_MESSAGE } from './translations';

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
    monitor: { type: 'http', duration: { us: 1000 } },
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
    monitor: { type: 'http', duration: { us: 1000 } },
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
    global.innerWidth = 1200;

    // Trigger the window resize event.
    global.dispatchEvent(new Event('resize'));
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
    localStorageMock = {
      getItem: jest.fn().mockImplementation(() => '25'),
      setItem: jest.fn(),
    };

    global.localStorage = localStorageMock;
  });

  it('renders a no items message when no data is provided', async () => {
    const { findByText } = render(
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
        refreshedMonitorIds={[]}
      />
    );
    expect(await findByText(NO_DATA_MESSAGE)).toBeInTheDocument();
  });

  it('renders the monitor list', async () => {
    const { findByLabelText } = render(
      <MonitorListComponent
        monitorList={{
          list: getMonitorList(moment().subtract(5, 'minute').toISOString()),
          loading: false,
        }}
        pageSize={10}
        setPageSize={jest.fn()}
        refreshedMonitorIds={[]}
      />
    );

    expect(
      await findByLabelText(
        'Monitor Status table with columns for Status, Name, URL, IP, Downtime History and Integrations. The table is currently displaying 2 items.'
      )
    ).toBeInTheDocument();
  });

  it('renders error list', async () => {
    const { findByText } = render(
      <MonitorListComponent
        monitorList={{
          list: getMonitorList(),
          error: new Error('foo message') as IHttpFetchError<ResponseErrorBody>,
          loading: false,
        }}
        pageSize={10}
        setPageSize={jest.fn()}
        refreshedMonitorIds={[]}
      />
    );

    expect(await findByText('foo message')).toBeInTheDocument();
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

    it('renders the pagination', async () => {
      const { findByText, findByLabelText } = render(
        <MonitorListComponent
          monitorList={{
            list: {
              ...paginationResult,
            },
            loading: false,
          }}
          pageSize={10}
          setPageSize={jest.fn()}
          refreshedMonitorIds={[]}
        />
      );

      expect(await findByText('Rows per page: 10')).toBeInTheDocument();
      expect(await findByLabelText('Prev page of results')).toBeInTheDocument();
      expect(await findByLabelText('Next page of results')).toBeInTheDocument();
    });
  });

  describe('responsive behavior', () => {
    describe('xl screens', () => {
      beforeAll(() => {
        global.innerWidth = 1200;

        // Trigger the window resize event.
        global.dispatchEvent(new Event('resize'));
      });

      it('shows ping histogram and expand button on xl and xxl screens', async () => {
        const list = getMonitorList(moment().subtract(5, 'minute').toISOString());
        const { getByTestId, getByText } = render(
          <MonitorListComponent
            monitorList={{
              list,
              loading: false,
            }}
            pageSize={10}
            setPageSize={jest.fn()}
            refreshedMonitorIds={[]}
          />
        );

        await waitFor(() => {
          expect(
            getByTestId(
              `xpack.uptime.monitorList.${list.summaries[0].monitor_id}.expandMonitorDetail`
            )
          ).toBeInTheDocument();
          expect(getByText('Downtime history')).toBeInTheDocument();
        });
      });
    });

    describe('large and medium screens', () => {
      it('hides ping histogram and expand button on extra large screens', async () => {
        global.innerWidth = 1199;

        // Trigger the window resize event.
        global.dispatchEvent(new Event('resize'));

        const { queryByTestId, queryByText } = render(
          <MonitorListComponent
            monitorList={{
              list: getMonitorList(moment().subtract(5, 'minute').toISOString()),
              loading: false,
            }}
            pageSize={10}
            setPageSize={jest.fn()}
            refreshedMonitorIds={[]}
          />
        );

        await waitFor(() => {
          expect(
            queryByTestId('xpack.uptime.monitorList.always-down.expandMonitorDetail')
          ).not.toBeInTheDocument();
          expect(queryByText('Downtime history')).not.toBeInTheDocument();
        });
      });
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
