/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { formatDuration, PingList } from './ping_list';
import { Ping, PingsResponse } from '../../../../common/runtime_types';
import { ExpandedRowMap } from '../../overview/monitor_list/types';
import { rowShouldExpand, toggleDetails } from './columns/expand_row';
import * as pingListHook from './use_pings';
import { mockDispatch } from '../../../lib/helper/test_helpers';
import { render } from '../../../lib/helper/rtl_helpers';

mockDispatch();

describe('PingList component', () => {
  const defaultPings = [
    {
      docId: 'fewjio21',
      timestamp: '2019-01-28T17:47:08.078Z',
      error: {
        message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
        type: 'io',
      },
      monitor: {
        duration: { us: 1430 },
        id: 'auto-tcp-0X81440A68E839814F',
        ip: '127.0.0.1',
        name: '',
        status: 'down',
        type: 'tcp',
      },
    },
    {
      docId: 'fewjoo21',
      timestamp: '2019-01-28T17:47:09.075Z',
      error: {
        message: 'dial tcp 127.0.0.1:9200: connect: connection refused',
        type: 'io',
      },
      monitor: {
        id: 'auto-tcp-0X81440A68E839814D',
        ip: '255.255.255.0',
        name: '',
        status: 'down',
        type: 'tcp',
      },
    },
  ];

  const response: PingsResponse = {
    total: 9231,
    pings: defaultPings,
  };

  beforeEach(() => {
    jest.spyOn(pingListHook, 'usePingsList').mockReturnValue({
      ...response,
      error: undefined,
      loading: false,
      failedSteps: { steps: [], checkGroups: ['1-f-4d-4f'] },
    });
  });

  it('renders loading state when pings are loading', () => {
    jest.spyOn(pingListHook, 'usePingsList').mockReturnValue({
      pings: [],
      total: 0,
      error: undefined,
      loading: true,
      failedSteps: { steps: [], checkGroups: ['1-f-4d-4f'] },
    });
    const { getByText } = render(<PingList />);
    expect(getByText('Loading history...')).toBeInTheDocument();
  });

  it('renders no pings state when pings are not found', () => {
    jest.spyOn(pingListHook, 'usePingsList').mockReturnValue({
      pings: [],
      total: 0,
      error: undefined,
      loading: false,
      failedSteps: { steps: [], checkGroups: ['1-f-4d-4f'] },
    });
    const { getByText } = render(<PingList />);
    expect(getByText('No history found')).toBeInTheDocument();
  });

  it('renders list without errors', () => {
    const { getByText } = render(<PingList />);
    expect(getByText(`${response.pings[0].monitor.ip}`)).toBeInTheDocument();
    expect(getByText(`${response.pings[1].monitor.ip}`)).toBeInTheDocument();
  });

  describe('toggleDetails', () => {
    let itemIdToExpandedRowMap: ExpandedRowMap;
    let pings: Ping[];

    const setItemIdToExpandedRowMap = (update: ExpandedRowMap) => (itemIdToExpandedRowMap = update);

    beforeEach(() => {
      itemIdToExpandedRowMap = {};
      pings = response.pings;
    });

    it('should expand an item if empty', () => {
      const ping = pings[0];
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(itemIdToExpandedRowMap).toMatchInlineSnapshot(`
        Object {
          "fewjio21": <PingListExpandedRowComponent
            ping={
              Object {
                "docId": "fewjio21",
                "error": Object {
                  "message": "dial tcp 127.0.0.1:9200: connect: connection refused",
                  "type": "io",
                },
                "monitor": Object {
                  "duration": Object {
                    "us": 1430,
                  },
                  "id": "auto-tcp-0X81440A68E839814F",
                  "ip": "127.0.0.1",
                  "name": "",
                  "status": "down",
                  "type": "tcp",
                },
                "timestamp": "2019-01-28T17:47:08.078Z",
              }
            }
          />,
        }
      `);
    });

    it('should un-expand an item if clicked again', () => {
      const ping = pings[0];
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      toggleDetails(ping, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(itemIdToExpandedRowMap).toEqual({});
    });

    it('should expand the new row and close the old when when a new row is clicked', () => {
      const pingA = pings[0];
      const pingB = pings[1];
      toggleDetails(pingA, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      toggleDetails(pingB, itemIdToExpandedRowMap, setItemIdToExpandedRowMap);
      expect(pingA.docId).not.toEqual(pingB.docId);
      expect(itemIdToExpandedRowMap[pingB.docId]).toMatchInlineSnapshot(`
        <PingListExpandedRowComponent
          ping={
            Object {
              "docId": "fewjoo21",
              "error": Object {
                "message": "dial tcp 127.0.0.1:9200: connect: connection refused",
                "type": "io",
              },
              "monitor": Object {
                "id": "auto-tcp-0X81440A68E839814D",
                "ip": "255.255.255.0",
                "name": "",
                "status": "down",
                "type": "tcp",
              },
              "timestamp": "2019-01-28T17:47:09.075Z",
            }
          }
        />
      `);
    });

    describe('rowShouldExpand', () => {
      // TODO: expand for all cases
      it('returns true for browser monitors', () => {
        const ping = pings[0];
        ping.monitor.type = 'browser';
        expect(rowShouldExpand(ping)).toBe(true);
      });
    });

    describe('duration column', () => {
      it('shows -- when duration is null', () => {
        const { getByTestId } = render(<PingList />);
        expect(getByTestId('ping-list-duration-unavailable-tool-tip')).toBeInTheDocument();
      });
    });

    describe('formatDuration', () => {
      it('returns zero for < 1 millisecond', () => {
        expect(formatDuration(984)).toBe('0 ms');
      });

      it('returns milliseconds string if < 1 seconds', () => {
        expect(formatDuration(921_039)).toBe('921 ms');
      });

      it('returns seconds string if > 1 second', () => {
        expect(formatDuration(1_032_100)).toBe('1 second');
      });

      it('rounds to closest second', () => {
        expect(formatDuration(1_832_100)).toBe('2 seconds');
      });
    });
  });
});
