/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { contextMessage, uniqueMonitorIds, updateState } from '../status_check';
import { GetMonitorStatusResult } from '../../requests';

describe('status check alert', () => {
  describe('updateState', () => {
    let spy: jest.SpyInstance<string, []>;
    beforeEach(() => {
      spy = jest.spyOn(Date.prototype, 'toISOString');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('sets initial state values', () => {
      spy.mockImplementation(() => 'foo date string');
      const result = updateState({}, false);
      expect(spy).toHaveBeenCalledTimes(1);
      expect(result).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "foo date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "foo date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
    });

    it('updates the correct field in subsequent calls', () => {
      spy
        .mockImplementationOnce(() => 'first date string')
        .mockImplementationOnce(() => 'second date string');
      const firstState = updateState({}, false);
      const secondState = updateState(firstState, true);
      expect(spy).toHaveBeenCalledTimes(2);
      expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
      expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "second date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
    });

    it('correctly marks resolution times', () => {
      spy
        .mockImplementationOnce(() => 'first date string')
        .mockImplementationOnce(() => 'second date string')
        .mockImplementationOnce(() => 'third date string');
      const firstState = updateState({}, true);
      const secondState = updateState(firstState, true);
      const thirdState = updateState(secondState, false);
      expect(spy).toHaveBeenCalledTimes(3);
      expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "first date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": true,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "first date string",
        }
      `);
      expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "first date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
      expect(thirdState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "first date string",
          "isTriggered": false,
          "lastCheckedAt": "third date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "second date string",
        }
      `);
    });

    it('correctly marks state fields across multiple triggers/resolutions', () => {
      spy
        .mockImplementationOnce(() => 'first date string')
        .mockImplementationOnce(() => 'second date string')
        .mockImplementationOnce(() => 'third date string')
        .mockImplementationOnce(() => 'fourth date string')
        .mockImplementationOnce(() => 'fifth date string');
      const firstState = updateState({}, false);
      const secondState = updateState(firstState, true);
      const thirdState = updateState(secondState, false);
      const fourthState = updateState(thirdState, true);
      const fifthState = updateState(fourthState, false);
      expect(spy).toHaveBeenCalledTimes(5);
      expect(firstState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "first date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
      expect(secondState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "second date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "second date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "second date string",
        }
      `);
      expect(thirdState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": false,
          "lastCheckedAt": "third date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "second date string",
        }
      `);
      expect(fourthState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "fourth date string",
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": true,
          "lastCheckedAt": "fourth date string",
          "lastResolvedAt": "third date string",
          "lastTriggeredAt": "fourth date string",
        }
      `);
      expect(fifthState).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "first date string",
          "firstTriggeredAt": "second date string",
          "isTriggered": false,
          "lastCheckedAt": "fifth date string",
          "lastResolvedAt": "fifth date string",
          "lastTriggeredAt": "fourth date string",
        }
      `);
    });
  });

  describe('uniqueMonitorIds', () => {
    let items: GetMonitorStatusResult[];
    beforeEach(() => {
      items = [
        {
          monitor_id: 'first',
          location: 'harrisburg',
          count: 234,
          status: 'down',
        },
        {
          monitor_id: 'first',
          location: 'fairbanks',
          count: 312,
          status: 'down',
        },
        {
          monitor_id: 'second',
          location: 'harrisburg',
          count: 325,
          status: 'down',
        },
        {
          monitor_id: 'second',
          location: 'fairbanks',
          count: 331,
          status: 'down',
        },
        {
          monitor_id: 'third',
          location: 'harrisburg',
          count: 331,
          status: 'down',
        },
        {
          monitor_id: 'third',
          location: 'fairbanks',
          count: 342,
          status: 'down',
        },
        {
          monitor_id: 'fourth',
          location: 'harrisburg',
          count: 355,
          status: 'down',
        },
        {
          monitor_id: 'fourth',
          location: 'fairbanks',
          count: 342,
          status: 'down',
        },
        {
          monitor_id: 'fifth',
          location: 'harrisburg',
          count: 342,
          status: 'down',
        },
        {
          monitor_id: 'fifth',
          location: 'fairbanks',
          count: 342,
          status: 'down',
        },
      ];
    });

    it('creates a set of unique IDs from a list of composite-unique objects', () => {
      expect(uniqueMonitorIds(items)).toEqual(
        new Set<string>(['first', 'second', 'third', 'fourth', 'fifth'])
      );
    });
  });

  describe('contextMessage', () => {
    let ids: string[];
    beforeEach(() => {
      ids = ['first', 'second', 'third', 'fourth', 'fifth'];
    });

    it('creates a message with appropriate number of monitors', () => {
      expect(contextMessage(ids, 3)).toBe(
        'Down monitors:\nfirst\nsecond\nthird\n...and 2 other monitors'
      );
    });

    it('throws an error if `max` is less than 2', () => {
      expect(() => contextMessage(ids, 1)).toThrowErrorMatchingInlineSnapshot(
        '"Maximum value must be greater than 2, received 1."'
      );
    });

    it('returns only the ids if length < max', () => {
      expect(contextMessage(ids.slice(0, 2), 3)).toBe('Down monitors:\nfirst\nsecond');
    });

    it('returns a default message when no monitors are provided', () => {
      expect(contextMessage([], 3)).toMatchInlineSnapshot(`"No down monitor IDs received"`);
    });
  });
});
