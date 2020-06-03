/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  contextMessage,
  fullListByIdAndLocation,
  genFilterString,
  hasFilters,
  statusCheckAlertFactory,
  uniqueMonitorIds,
} from '../status_check';
import { GetMonitorStatusResult } from '../../requests';
import { AlertType } from '../../../../../alerts/server';
import { IRouter } from 'kibana/server';
import { UMServerLibs } from '../../lib';
import { UptimeCoreSetup } from '../../adapters';
import { DYNAMIC_SETTINGS_DEFAULTS } from '../../../../common/constants';
import { alertsMock, AlertServicesMock } from '../../../../../alerts/server/mocks';

/**
 * The alert takes some dependencies as parameters; these are things like
 * kibana core services and plugins. This function helps reduce the amount of
 * boilerplate required.
 * @param customRequests client tests can use this paramter to provide their own request mocks,
 * so we don't have to mock them all for each test.
 */
const bootstrapDependencies = (customRequests?: any) => {
  const router: IRouter = {} as IRouter;
  // these server/libs parameters don't have any functionality, which is fine
  // because we aren't testing them here
  const server: UptimeCoreSetup = { router };
  const libs: UMServerLibs = { requests: {} } as UMServerLibs;
  libs.requests = { ...libs.requests, ...customRequests };
  return { server, libs };
};

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param params the params received at alert creation time
 * @param services the core services provided by kibana/alerts platforms
 * @param state the state the alert maintains
 */
const mockOptions = (
  params = { numTimes: 5, locations: [], timerange: { from: 'now-15m', to: 'now' } },
  services = alertsMock.createAlertServices(),
  state = {}
): any => {
  services.savedObjectsClient.get.mockResolvedValue({
    id: '',
    type: '',
    references: [],
    attributes: DYNAMIC_SETTINGS_DEFAULTS,
  });
  return {
    params,
    services,
    state,
  };
};

describe('status check alert', () => {
  let toISOStringSpy: jest.SpyInstance<string, []>;
  beforeEach(() => {
    toISOStringSpy = jest.spyOn(Date.prototype, 'toISOString');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
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
            "callES": [MockFunction],
            "dynamicSettings": Object {
              "certAgeThreshold": 730,
              "certExpirationThreshold": 30,
              "heartbeatIndices": "heartbeat-8*",
            },
            "locations": Array [],
            "numTimes": 5,
            "timerange": Object {
              "from": "now-15m",
              "to": "now",
            },
          },
        ]
      `);
    });

    it('triggers when monitors are down and provides expected state', async () => {
      toISOStringSpy.mockImplementation(() => 'foo date string');
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
      const options = mockOptions();
      const alertServices: AlertServicesMock = options.services;
      // @ts-ignore the executor can return `void`, but ours never does
      const state: Record<string, any> = await alert.executor(options);
      expect(mockGetter).toHaveBeenCalledTimes(1);
      expect(alertServices.alertInstanceFactory).toHaveBeenCalledTimes(1);
      expect(mockGetter.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": [MockFunction],
            "dynamicSettings": Object {
              "certAgeThreshold": 730,
              "certExpirationThreshold": 30,
              "heartbeatIndices": "heartbeat-8*",
            },
            "locations": Array [],
            "numTimes": 5,
            "timerange": Object {
              "from": "now-15m",
              "to": "now",
            },
          },
        ]
      `);
      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.replaceState.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "currentTriggerStarted": "foo date string",
            "firstCheckedAt": "foo date string",
            "firstTriggeredAt": "foo date string",
            "isTriggered": true,
            "lastCheckedAt": "foo date string",
            "lastResolvedAt": undefined,
            "lastTriggeredAt": "foo date string",
            "monitors": Array [
              Object {
                "count": 234,
                "location": "fairbanks",
                "monitor_id": "first",
                "status": "down",
              },
              Object {
                "count": 234,
                "location": "harrisburg",
                "monitor_id": "first",
                "status": "down",
              },
            ],
          },
        ]
      `);
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.scheduleActions.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          "xpack.uptime.alerts.actionGroups.monitorStatus",
          Object {
            "downMonitorsWithGeo": "first from fairbanks; first from harrisburg; ",
            "message": "Down monitor: first",
          },
        ]
      `);
    });
  });

  describe('fullListByIdAndLocation', () => {
    it('renders a list of all monitors', () => {
      const statuses: GetMonitorStatusResult[] = [
        {
          location: 'harrisburg',
          monitor_id: 'first',
          status: 'down',
          count: 34,
        },
        {
          location: 'fairbanks',
          monitor_id: 'second',
          status: 'down',
          count: 23,
        },
        {
          location: 'fairbanks',
          monitor_id: 'first',
          status: 'down',
          count: 23,
        },
        {
          location: 'harrisburg',
          monitor_id: 'second',
          status: 'down',
          count: 34,
        },
      ];
      expect(fullListByIdAndLocation(statuses)).toMatchInlineSnapshot(
        `"first from fairbanks; first from harrisburg; second from fairbanks; second from harrisburg; "`
      );
    });

    it('renders a list of monitors when greater than limit', () => {
      const statuses: GetMonitorStatusResult[] = [
        {
          location: 'fairbanks',
          monitor_id: 'second',
          status: 'down',
          count: 23,
        },
        {
          location: 'fairbanks',
          monitor_id: 'first',
          status: 'down',
          count: 23,
        },
        {
          location: 'harrisburg',
          monitor_id: 'first',
          status: 'down',
          count: 34,
        },
        {
          location: 'harrisburg',
          monitor_id: 'second',
          status: 'down',
          count: 34,
        },
      ];
      expect(fullListByIdAndLocation(statuses.slice(0, 2), 1)).toMatchInlineSnapshot(
        `"first from fairbanks; ...and 1 other monitor/location"`
      );
    });

    it('renders expected list of monitors when limit difference > 1', () => {
      const statuses: GetMonitorStatusResult[] = [
        {
          location: 'fairbanks',
          monitor_id: 'second',
          status: 'down',
          count: 23,
        },
        {
          location: 'harrisburg',
          monitor_id: 'first',
          status: 'down',
          count: 34,
        },
        {
          location: 'harrisburg',
          monitor_id: 'second',
          status: 'down',
          count: 34,
        },
        {
          location: 'harrisburg',
          monitor_id: 'third',
          status: 'down',
          count: 34,
        },
        {
          location: 'fairbanks',
          monitor_id: 'third',
          status: 'down',
          count: 23,
        },
        {
          location: 'fairbanks',
          monitor_id: 'first',
          status: 'down',
          count: 23,
        },
      ];
      expect(fullListByIdAndLocation(statuses, 4)).toMatchInlineSnapshot(
        `"first from fairbanks; first from harrisburg; second from fairbanks; second from harrisburg; ...and 2 other monitors/locations"`
      );
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
          "locations",
          "numTimes",
          "search",
          "timerangeCount",
          "timerangeUnit",
          "timerange",
        ]
      `);
    });

    it('contains the expected static fields like id, name, etc.', () => {
      expect(alert.id).toBe('xpack.uptime.alerts.monitorStatus');
      expect(alert.name).toBe('Uptime monitor status');
      expect(alert.defaultActionGroupId).toBe('xpack.uptime.alerts.actionGroups.monitorStatus');
      expect(alert.actionGroups).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "xpack.uptime.alerts.actionGroups.monitorStatus",
            "name": "Uptime Down Monitor",
          },
        ]
      `);
    });
  });

  describe('hasFilters', () => {
    it('returns false for undefined filters', () => {
      expect(hasFilters()).toBe(false);
    });

    it('returns false for empty filters', () => {
      expect(
        hasFilters({
          'monitor.type': [],
          'observer.geo.name': [],
          tags: [],
          'url.port': [],
        })
      ).toBe(false);
    });

    it('returns true for an object with a filter', () => {
      expect(
        hasFilters({
          'monitor.type': [],
          'observer.geo.name': ['us-east', 'us-west'],
          tags: [],
          'url.port': [],
        })
      ).toBe(true);
    });
  });

  describe('genFilterString', () => {
    const mockGetIndexPattern = jest.fn();
    mockGetIndexPattern.mockReturnValue(undefined);

    it('returns `undefined` for no filters or search', async () => {
      expect(await genFilterString(mockGetIndexPattern)).toBeUndefined();
    });

    it('creates a filter string for filters only', async () => {
      const res = await genFilterString(mockGetIndexPattern, {
        'monitor.type': [],
        'observer.geo.name': ['us-east', 'us-west'],
        tags: [],
        'url.port': [],
      });
      expect(res).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "observer.geo.name": "us-east",
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match": Object {
                        "observer.geo.name": "us-west",
                      },
                    },
                  ],
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a filter string for search only', async () => {
      expect(await genFilterString(mockGetIndexPattern, undefined, 'monitor.id: "kibana-dev"'))
        .toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "minimum_should_match": 1,
            "should": Array [
              Object {
                "match_phrase": Object {
                  "monitor.id": "kibana-dev",
                },
              },
            ],
          },
        }
      `);
    });

    it('creates a filter string for filters and string', async () => {
      const res = await genFilterString(
        mockGetIndexPattern,
        {
          'monitor.type': [],
          'observer.geo.name': ['us-east', 'apj', 'sydney', 'us-west'],
          tags: [],
          'url.port': [],
        },
        'monitor.id: "kibana-dev"'
      );
      expect(res).toMatchInlineSnapshot(`
        Object {
          "bool": Object {
            "filter": Array [
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "match": Object {
                              "observer.geo.name": "us-east",
                            },
                          },
                        ],
                      },
                    },
                    Object {
                      "bool": Object {
                        "minimum_should_match": 1,
                        "should": Array [
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "match": Object {
                                    "observer.geo.name": "apj",
                                  },
                                },
                              ],
                            },
                          },
                          Object {
                            "bool": Object {
                              "minimum_should_match": 1,
                              "should": Array [
                                Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match": Object {
                                          "observer.geo.name": "sydney",
                                        },
                                      },
                                    ],
                                  },
                                },
                                Object {
                                  "bool": Object {
                                    "minimum_should_match": 1,
                                    "should": Array [
                                      Object {
                                        "match": Object {
                                          "observer.geo.name": "us-west",
                                        },
                                      },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              },
              Object {
                "bool": Object {
                  "minimum_should_match": 1,
                  "should": Array [
                    Object {
                      "match_phrase": Object {
                        "monitor.id": "kibana-dev",
                      },
                    },
                  ],
                },
              },
            ],
          },
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

    it('creates a set of unique IDs from a list of composite unique objects', () => {
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
      expect(contextMessage(ids, 3)).toMatchInlineSnapshot(
        `"Down monitors: first, second, third... and 2 other monitors"`
      );
    });

    it('throws an error if `max` is less than 2', () => {
      expect(() => contextMessage(ids, 1)).toThrowErrorMatchingInlineSnapshot(
        '"Maximum value must be greater than 2, received 1."'
      );
    });

    it('returns only the ids if length < max', () => {
      expect(contextMessage(ids.slice(0, 2), 3)).toMatchInlineSnapshot(
        `"Down monitors: first, second"`
      );
    });

    it('returns a default message when no monitors are provided', () => {
      expect(contextMessage([], 3)).toMatchInlineSnapshot(`"No down monitor IDs received"`);
    });
  });
});
