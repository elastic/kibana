/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { eventType, orderByTime, userInfoForProcess } from './process_event';

import { mockProcessEvent } from './process_event_test_helpers';
import { LegacyEndpointEvent, ResolverNode } from '../../../common/endpoint/types';

describe('process event', () => {
  describe('eventType', () => {
    let event: LegacyEndpointEvent;
    beforeEach(() => {
      event = mockProcessEvent({
        endgame: {
          unique_pid: 1,
          event_type_full: 'process_event',
        },
      });
    });
    it("returns the right value when the subType is 'creation_event'", () => {
      event.endgame.event_subtype_full = 'creation_event';
      expect(eventType(event)).toEqual('processCreated');
    });
  });
  describe('userInfoForProcess', () => {
    let event: LegacyEndpointEvent;
    beforeEach(() => {
      event = mockProcessEvent({
        user: {
          name: 'aaa',
          domain: 'bbb',
        },
      });
    });
    it('returns the right user info for the process', () => {
      const { name, domain } = userInfoForProcess(event)!;
      expect(name).toEqual('aaa');
      expect(domain).toEqual('bbb');
    });
  });
  describe('orderByTime', () => {
    let mock: (time: number, nodeID: string) => ResolverNode;
    let events: ResolverNode[];
    beforeEach(() => {
      mock = (time, nodeID) => ({
        data: {
          '@timestamp': time,
        },
        id: nodeID,
        stats: {
          total: 0,
          byCategory: {},
        },
      });
      // 2 events each for numbers -1, 0, 1, and NaN
      // each event has a unique id, a through h
      // order is arbitrary
      events = [
        mock(-1, 'a'),
        mock(0, 'c'),
        mock(1, 'e'),
        mock(NaN, 'g'),
        mock(-1, 'b'),
        mock(0, 'd'),
        mock(1, 'f'),
        mock(NaN, 'h'),
      ];
    });
    it('sorts events as expected', () => {
      events.sort(orderByTime);
      expect(events).toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {
              "@timestamp": -1,
            },
            "id": "a",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": -1,
            },
            "id": "b",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": 0,
            },
            "id": "c",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": 0,
            },
            "id": "d",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": 1,
            },
            "id": "e",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": 1,
            },
            "id": "f",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": NaN,
            },
            "id": "g",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
          Object {
            "data": Object {
              "@timestamp": NaN,
            },
            "id": "h",
            "stats": Object {
              "byCategory": Object {},
              "total": 0,
            },
          },
        ]
      `);
    });
  });
});
