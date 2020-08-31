/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { eventType, orderByTime, userInfoForProcess } from './process_event';

import { mockProcessEvent } from './process_event_test_helpers';
import {
  LegacyEndpointEvent,
  ResolverEvent,
  SafeResolverEvent,
} from '../../../common/endpoint/types';

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
    let mock: (time: number, eventID: string) => ResolverEvent;
    let events: SafeResolverEvent[];
    beforeEach(() => {
      mock = (time, eventID) => {
        return {
          '@timestamp': time,
          event: {
            id: eventID,
          },
        } as ResolverEvent;
      };
      // 2 events each for numbers -1, 0, 1, and NaN
      // each event has a unique id, a through h
      // order is arbitrary
      events = [
        mock(-1, 'a') as SafeResolverEvent,
        mock(0, 'c') as SafeResolverEvent,
        mock(1, 'e') as SafeResolverEvent,
        mock(NaN, 'g') as SafeResolverEvent,
        mock(-1, 'b') as SafeResolverEvent,
        mock(0, 'd') as SafeResolverEvent,
        mock(1, 'f') as SafeResolverEvent,
        mock(NaN, 'h') as SafeResolverEvent,
      ];
    });
    it('sorts events as expected', () => {
      events.sort(orderByTime);
      expect(events).toMatchInlineSnapshot(`
        Array [
          Object {
            "@timestamp": -1,
            "event": Object {
              "id": "a",
            },
          },
          Object {
            "@timestamp": -1,
            "event": Object {
              "id": "b",
            },
          },
          Object {
            "@timestamp": 0,
            "event": Object {
              "id": "c",
            },
          },
          Object {
            "@timestamp": 0,
            "event": Object {
              "id": "d",
            },
          },
          Object {
            "@timestamp": 1,
            "event": Object {
              "id": "e",
            },
          },
          Object {
            "@timestamp": 1,
            "event": Object {
              "id": "f",
            },
          },
          Object {
            "@timestamp": NaN,
            "event": Object {
              "id": "g",
            },
          },
          Object {
            "@timestamp": NaN,
            "event": Object {
              "id": "h",
            },
          },
        ]
      `);
    });
  });
});
