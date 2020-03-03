/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  contextMessage,
  uniqueMonitorIds,
  updateState,
  statusCheckAlertFactory,
} from '../status_check';
import { GetMonitorStatusResult } from '../../requests';
import { AlertType } from '../../../../../alerting/server';
import { IRouter } from 'kibana/server';
import { UMServerLibs } from '../../lib';
import { UptimeCoreSetup } from '../../adapters';

/**
 * The alert takes some dependencies as parameters; these are things like
 * kibana core services and plugins. This funciton helps reduce the amount of
 * boilerplate required.
 * @param customRequests client tests can use this paramter to provide their own request mocks,
 * so we don't have to mock them all for each test.
 */
const bootstrapDependencies = (customRequests?: any) => {
  const route: IRouter = {} as IRouter;
  // these server/libs parameters don't have any functionality, which is fine
  // because we aren't testing them here
  const server: UptimeCoreSetup = { route };
  const libs: UMServerLibs = { requests: {} } as UMServerLibs;
  libs.requests = { ...libs.requests, ...customRequests };
  return { server, libs };
};

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param params the params received at alert creation time
 * @param services the core services provided by kibana/alerting platforms
 * @param state the state the alert maintains
 */
const mockOptions = (
  params = { foo: 'bar' },
  services = { callCluster: 'mockESFunction' },
  state = {}
): any => ({
  params,
  services,
  state,
});

describe('status check alert', () => {
  describe('executor', () => {
    it('does not trigger when there are no monitors down', async () => {
      expect.assertions(4);
      const mockGetter = jest.fn();
      mockGetter.mockReturnValue([]);
      const { server, libs } = bootstrapDependencies({ getMonitorStatus: mockGetter });
      const alert = statusCheckAlertFactory(server, libs);
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(mockOptions());

      expect(state).not.toBeUndefined();
      expect(state?.isTriggered).toBe(false);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(mockGetter.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": "mockESFunction",
            "foo": "bar",
          },
        ]
      `);
    });

    it('triggers when monitors are down and provides expected state', async () => {
      const mockGetter = jest.fn();
      mockGetter.mockReturnValue([
        {
          monitor_id: 'first',
          location: 'harrisburg',
          count: 234,
          status: 'down',
        },
        {
          monitor_id: 'first',
          location: 'fairbanks',
          count: 234,
          status: 'down',
        },
      ]);
      const { server, libs } = bootstrapDependencies({ getMonitorStatus: mockGetter });
      const alert = statusCheckAlertFactory(server, libs);
      const mockInstanceFactory = jest.fn();
      const mockReplaceState = jest.fn();
      const mockScheduleActions = jest.fn();
      mockInstanceFactory.mockReturnValue({
        replaceState: mockReplaceState,
        scheduleActions: mockScheduleActions,
      });
      const options = mockOptions();
      options.services = {
        ...options.services,
        alertInstanceFactory: mockInstanceFactory,
      };
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(mockInstanceFactory).toHaveBeenCalledTimes(1);
      expect(mockGetter.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": "mockESFunction",
            "foo": "bar",
          },
        ]
      `);
      expect(mockReplaceState).toHaveBeenCalledTimes(1);
      expect(mockReplaceState.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "monitors": Array [
              Object {
                "count": 234,
                "location": "harrisburg",
                "monitor_id": "first",
                "status": "down",
              },
              Object {
                "count": 234,
                "location": "fairbanks",
                "monitor_id": "first",
                "status": "down",
              },
            ],
          },
        ]
      `);
      expect(mockScheduleActions).toHaveBeenCalledTimes(1);
      expect(mockScheduleActions.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "xpack.uptime.alerts.actionGroups.downMonitor",
          Object {
            "message": "Down monitor:
        first",
            "monitors": Array [
              Object {
                "count": 234,
                "location": "harrisburg",
                "monitor_id": "first",
                "status": "down",
              },
              Object {
                "count": 234,
                "location": "fairbanks",
                "monitor_id": "first",
                "status": "down",
              },
            ],
            "server": Object {
              "route": Object {},
            },
          },
        ]
      `);
    });
  });

  describe('alert factory', () => {
    let alert: AlertType;

    beforeEach(() => {
      const { server, libs } = bootstrapDependencies();
      alert = statusCheckAlertFactory(server, libs);
    });

    it('creates an alert with expected params', () => {
      // @ts-ignore the `props` key here isn't described
      expect(Object.keys(alert.validate?.params?.props ?? {})).toMatchInlineSnapshot(`
        Array [
          "filters",
          "numTimes",
          "timerange",
          "locations",
        ]
      `);
    });

    it('contains the expected static fields like id, name, etc.', () => {
      expect(alert.id).toBe('xpack.uptime.alerts.downMonitor');
      expect(alert.name).toBe('X-Pack Alerting');
      expect(alert.defaultActionGroupId).toBe('xpack.uptime.alerts.actionGroups.downMonitor');
      expect(alert.actionGroups).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "xpack.uptime.alerts.actionGroups.downMonitor",
            "name": "Uptime Down Monitor",
          },
        ]
      `);
    });
  });

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
