/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  contextMessage,
  fullListByIdAndLocation,
  generateFilterDSL,
  hasFilters,
  statusCheckAlertFactory,
  uniqueMonitorIds,
  availabilityMessage,
} from '../status_check';
import { GetMonitorStatusResult } from '../../requests';
import { AlertType } from '../../../../../alerts/server';
import { IRouter } from 'kibana/server';
import { UMServerLibs } from '../../lib';
import { UptimeCorePlugins, UptimeCoreSetup } from '../../adapters';
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
  const plugins: UptimeCorePlugins = {} as any;
  const libs: UMServerLibs = { requests: {} } as UMServerLibs;
  libs.requests = { ...libs.requests, ...customRequests };
  return { server, libs, plugins };
};

/**
 * This function aims to provide an easy way to give mock props that will
 * reduce boilerplate for tests.
 * @param params the params received at alert creation time
 * @param services the core services provided by kibana/alerts platforms
 * @param state the state the alert maintains
 */
const mockOptions = (
  params: any = {
    numTimes: 5,
    locations: [],
    timerange: { from: 'now-15m', to: 'now' },
    shouldCheckStatus: true,
  },
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
      const { server, libs, plugins } = bootstrapDependencies({ getMonitorStatus: mockGetter });
      const alert = statusCheckAlertFactory(server, libs, plugins);
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
            "shouldCheckStatus": true,
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
      const { server, libs, plugins } = bootstrapDependencies({ getMonitorStatus: mockGetter });
      const alert = statusCheckAlertFactory(server, libs, plugins);
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
            "shouldCheckStatus": true,
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

    it('supports 7.7 alert format', async () => {
      toISOStringSpy.mockImplementation(() => '7.7 date');
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
      const { server, libs, plugins } = bootstrapDependencies({
        getMonitorStatus: mockGetter,
        getIndexPattern: jest.fn(),
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        numTimes: 4,
        timerange: { from: 'now-14h', to: 'now' },
        locations: ['fairbanks'],
        filters: '',
      });
      const alertServices: AlertServicesMock = options.services;
      const state = await alert.executor(options);
      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.replaceState.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "currentTriggerStarted": "7.7 date",
            "firstCheckedAt": "7.7 date",
            "firstTriggeredAt": "7.7 date",
            "isTriggered": true,
            "lastCheckedAt": "7.7 date",
            "lastResolvedAt": undefined,
            "lastTriggeredAt": "7.7 date",
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
      expect(state).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "7.7 date",
          "firstCheckedAt": "7.7 date",
          "firstTriggeredAt": "7.7 date",
          "isTriggered": true,
          "lastCheckedAt": "7.7 date",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "7.7 date",
        }
      `);
    });

    it('supports 7.8 alert format', async () => {
      expect.assertions(5);
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
      const { server, libs, plugins } = bootstrapDependencies({
        getMonitorStatus: mockGetter,
        getIndexPattern: jest.fn(),
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        numTimes: 3,
        timerangeUnit: 'm',
        timerangeCount: 15,
        search: 'monitor.ip : * ',
        filters: {
          'url.port': ['12349', '5601', '443'],
          'observer.geo.name': ['harrisburg'],
          'monitor.type': ['http'],
          tags: ['unsecured', 'containers', 'org:google'],
        },
      });
      const alertServices: AlertServicesMock = options.services;
      const state = await alert.executor(options);
      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
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
            "filters": "{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":12349}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":5601}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":443}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"observer.geo.name\\":\\"harrisburg\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"monitor.type\\":\\"http\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"tags\\":\\"unsecured\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"tags\\":\\"containers\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"tags\\":\\"org:google\\"}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}]}}]}}]}},{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"monitor.ip\\"}}],\\"minimum_should_match\\":1}}]}}",
            "locations": Array [],
            "numTimes": 3,
            "timerange": Object {
              "from": "now-15m",
              "to": "now",
            },
          },
        ]
      `);
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
      expect(state).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": "foo date string",
          "firstCheckedAt": "foo date string",
          "firstTriggeredAt": "foo date string",
          "isTriggered": true,
          "lastCheckedAt": "foo date string",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": "foo date string",
        }
      `);
    });

    it('supports searches', async () => {
      toISOStringSpy.mockImplementation(() => 'search test');
      const mockGetter = jest.fn();
      mockGetter.mockReturnValue([]);
      const { server, libs, plugins } = bootstrapDependencies({
        getIndexPattern: jest.fn(),
        getMonitorStatus: mockGetter,
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        numTimes: 20,
        timerangeCount: 30,
        timerangeUnit: 'h',
        filters: {
          'monitor.type': ['http'],
          'observer.geo.name': [],
          tags: [],
          'url.port': [],
        },
        search: 'url.full: *',
      });
      await alert.executor(options);
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
            "filters": "{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"monitor.type\\":\\"http\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"url.full\\"}}],\\"minimum_should_match\\":1}}]}}",
            "locations": Array [],
            "numTimes": 20,
            "timerange": Object {
              "from": "now-30h",
              "to": "now",
            },
          },
        ]
      `);
    });

    it('supports availability checks', async () => {
      expect.assertions(8);
      toISOStringSpy.mockImplementation(() => 'availability test');
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
      const mockAvailability = jest.fn();
      mockAvailability.mockReturnValue([
        {
          monitorId: 'foo',
          location: 'harrisburg',
          name: 'Foo',
          url: 'https://foo.com',
          up: 2341,
          down: 17,
          availabilityRatio: 0.992790500424088,
        },
        {
          monitorId: 'foo',
          location: 'fairbanks',
          name: 'Foo',
          url: 'https://foo.com',
          up: 2343,
          down: 47,
          availabilityRatio: 0.980334728033473,
        },
        {
          monitorId: 'unreliable',
          location: 'fairbanks',
          name: 'Unreliable',
          url: 'https://unreliable.co',
          up: 2134,
          down: 213,
          availabilityRatio: 0.909245845760545,
        },
        {
          monitorId: 'no-name',
          location: 'fairbanks',
          url: 'https://no-name.co',
          up: 2134,
          down: 213,
          availabilityRatio: 0.909245845760545,
        },
      ]);
      const { server, libs, plugins } = bootstrapDependencies({
        getMonitorAvailability: mockAvailability,
        getMonitorStatus: mockGetter,
        getIndexPattern: jest.fn(),
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        availability: {
          range: 35,
          rangeUnit: 'd',
          threshold: '99.34',
        },
        filters: {
          'url.port': ['12349', '5601', '443'],
          'observer.geo.name': ['harrisburg'],
          'monitor.type': ['http'],
          tags: ['unsecured', 'containers', 'org:google'],
        },
        shouldCheckAvailability: true,
      });
      const alertServices: AlertServicesMock = options.services;
      const state = await alert.executor(options);
      const [{ value: alertInstanceMock }] = alertServices.alertInstanceFactory.mock.results;
      expect(alertInstanceMock.replaceState).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.replaceState.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "currentTriggerStarted": "availability test",
            "firstCheckedAt": "availability test",
            "firstTriggeredAt": "availability test",
            "isTriggered": true,
            "lastCheckedAt": "availability test",
            "lastResolvedAt": undefined,
            "lastTriggeredAt": "availability test",
            "monitors": Array [],
          },
        ]
      `);
      expect(alertInstanceMock.scheduleActions).toHaveBeenCalledTimes(1);
      expect(alertInstanceMock.scheduleActions.mock.calls).toMatchInlineSnapshot(`
        Array [
          Array [
            "xpack.uptime.alerts.actionGroups.monitorStatus",
            Object {
              "downMonitorsWithGeo": "",
              "message": "Top 3 Monitors Below Availability Threshold (99.34 %):
        Unreliable(https://unreliable.co): 90.925%
        no-name(https://no-name.co): 90.925%
        Foo(https://foo.com): 98.033%
        ",
            },
          ],
        ]
      `);
      expect(mockGetter).not.toHaveBeenCalled();
      expect(mockAvailability).toHaveBeenCalledTimes(1);
      expect(mockAvailability.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": [MockFunction],
            "dynamicSettings": Object {
              "certAgeThreshold": 730,
              "certExpirationThreshold": 30,
              "heartbeatIndices": "heartbeat-8*",
            },
            "filters": "{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":12349}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":5601}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"url.port\\":443}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"observer.geo.name\\":\\"harrisburg\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"filter\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"monitor.type\\":\\"http\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"tags\\":\\"unsecured\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"bool\\":{\\"should\\":[{\\"match\\":{\\"tags\\":\\"containers\\"}}],\\"minimum_should_match\\":1}},{\\"bool\\":{\\"should\\":[{\\"match_phrase\\":{\\"tags\\":\\"org:google\\"}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}],\\"minimum_should_match\\":1}}]}}]}}]}}",
            "range": 35,
            "rangeUnit": "d",
            "threshold": "99.34",
          },
        ]
      `);
      expect(state).toMatchInlineSnapshot(`
        Object {
          "currentTriggerStarted": undefined,
          "firstCheckedAt": "availability test",
          "firstTriggeredAt": undefined,
          "isTriggered": false,
          "lastCheckedAt": "availability test",
          "lastResolvedAt": undefined,
          "lastTriggeredAt": undefined,
        }
      `);
    });

    it('supports availability checks with search', async () => {
      expect.assertions(2);
      toISOStringSpy.mockImplementation(() => 'availability with search');
      const mockGetter = jest.fn();
      mockGetter.mockReturnValue([]);
      const mockAvailability = jest.fn();
      mockAvailability.mockReturnValue([]);
      const { server, libs, plugins } = bootstrapDependencies({
        getMonitorAvailability: mockAvailability,
        getIndexPattern: jest.fn(),
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        availability: {
          range: 23,
          rangeUnit: 'w',
          threshold: '90',
        },
        search: 'ur.port: *',
        shouldCheckAvailability: true,
      });
      await alert.executor(options);
      expect(mockAvailability).toHaveBeenCalledTimes(1);
      expect(mockAvailability.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": [MockFunction],
            "dynamicSettings": Object {
              "certAgeThreshold": 730,
              "certExpirationThreshold": 30,
              "heartbeatIndices": "heartbeat-8*",
            },
            "filters": "{\\"bool\\":{\\"should\\":[{\\"exists\\":{\\"field\\":\\"ur.port\\"}}],\\"minimum_should_match\\":1}}",
            "range": 23,
            "rangeUnit": "w",
            "threshold": "90",
          },
        ]
      `);
    });

    it('supports availability checks with no filter or search', async () => {
      expect.assertions(2);
      toISOStringSpy.mockImplementation(() => 'availability with search');
      const mockGetter = jest.fn();
      mockGetter.mockReturnValue([]);
      const mockAvailability = jest.fn();
      mockAvailability.mockReturnValue([]);
      const { server, libs, plugins } = bootstrapDependencies({
        getMonitorAvailability: mockAvailability,
        getIndexPattern: jest.fn(),
      });
      const alert = statusCheckAlertFactory(server, libs, plugins);
      const options = mockOptions({
        availability: {
          range: 23,
          rangeUnit: 'w',
          threshold: '90',
        },
        shouldCheckAvailability: true,
      });
      await alert.executor(options);
      expect(mockAvailability).toHaveBeenCalledTimes(1);
      expect(mockAvailability.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "callES": [MockFunction],
            "dynamicSettings": Object {
              "certAgeThreshold": 730,
              "certExpirationThreshold": 30,
              "heartbeatIndices": "heartbeat-8*",
            },
            "filters": undefined,
            "range": 23,
            "rangeUnit": "w",
            "threshold": "90",
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
      const { server, libs, plugins } = bootstrapDependencies();
      alert = statusCheckAlertFactory(server, libs, plugins);
    });

    it('creates an alert with expected params', () => {
      // @ts-ignore the `props` key here isn't described
      expect(Object.keys(alert.validate?.params?.props ?? {})).toMatchInlineSnapshot(`
        Array [
          "availability",
          "filters",
          "locations",
          "numTimes",
          "search",
          "shouldCheckStatus",
          "shouldCheckAvailability",
          "timerangeCount",
          "timerangeUnit",
          "timerange",
          "version",
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
      expect(await generateFilterDSL(mockGetIndexPattern)).toBeUndefined();
    });

    it('creates a filter string for filters only', async () => {
      const res = await generateFilterDSL(mockGetIndexPattern, {
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
      expect(await generateFilterDSL(mockGetIndexPattern, undefined, 'monitor.id: "kibana-dev"'))
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
      const res = await generateFilterDSL(
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
      expect(contextMessage(ids, 3, [], '0', false, true)).toMatchInlineSnapshot(
        `"Down monitors: first, second, third... and 2 other monitors"`
      );
    });

    it('throws an error if `max` is less than 2', () => {
      expect(() => contextMessage(ids, 1, [], '0', false, true)).toThrowErrorMatchingInlineSnapshot(
        '"Maximum value must be greater than 2, received 1."'
      );
    });

    it('returns only the ids if length < max', () => {
      expect(contextMessage(ids.slice(0, 2), 3, [], '0', false, true)).toMatchInlineSnapshot(
        `"Down monitors: first, second"`
      );
    });

    it('returns a default message when no monitors are provided', () => {
      expect(contextMessage([], 3, [], '0', false, true)).toMatchInlineSnapshot(
        `"No down monitor IDs received"`
      );
    });
  });

  describe('availabilityMessage', () => {
    it('creates message for singular item', () => {
      expect(
        availabilityMessage(
          [
            {
              monitorId: 'test-node-service',
              location: 'fairbanks',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 821.0,
              down: 2450.0,
              availabilityRatio: 0.25099357994497096,
            },
          ],
          '59'
        )
      ).toMatchInlineSnapshot(`
        "Monitor Below Availability Threshold (59 %):
        Test Node Service(http://localhost:12349): 25.099%
        "
      `);
    });

    it('creates message for multiple items', () => {
      expect(
        availabilityMessage(
          [
            {
              monitorId: 'test-node-service',
              location: 'fairbanks',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 821.0,
              down: 2450.0,
              availabilityRatio: 0.25099357994497096,
            },
            {
              monitorId: 'test-node-service',
              location: 'harrisburg',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 3389.0,
              down: 2450.0,
              availabilityRatio: 0.5804076040417879,
            },
          ],
          '59'
        )
      ).toMatchInlineSnapshot(`
        "Top 2 Monitors Below Availability Threshold (59 %):
        Test Node Service(http://localhost:12349): 25.099%
        Test Node Service(http://localhost:12349): 58.041%
        "
      `);
    });

    it('caps message for multiple items', () => {
      expect(
        availabilityMessage(
          [
            {
              monitorId: 'test-node-service',
              location: 'fairbanks',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 821.0,
              down: 2450.0,
              availabilityRatio: 0.250993579944971,
            },
            {
              monitorId: 'test-node-service',
              location: 'harrisburg',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 3389.0,
              down: 2450.0,
              availabilityRatio: 0.58040760404178,
            },
            {
              monitorId: 'test-node-service',
              location: 'berlin',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 3645.0,
              down: 2982.0,
              availabilityRatio: 0.550022634676324,
            },
            {
              monitorId: 'test-node-service',
              location: 'st paul',
              name: 'Test Node Service',
              url: 'http://localhost:12349',
              up: 3601.0,
              down: 2681.0,
              availabilityRatio: 0.573225087551735,
            },
          ],
          '59'
        )
      ).toMatchInlineSnapshot(`
        "Top 3 Monitors Below Availability Threshold (59 %):
        Test Node Service(http://localhost:12349): 25.099%
        Test Node Service(http://localhost:12349): 55.002%
        Test Node Service(http://localhost:12349): 57.323%
        "
      `);
    });
  });
});
