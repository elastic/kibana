/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IBasePath } from '@kbn/core/server';
import { updateState, setRecoveredAlertsContext } from './common';
import { SyntheticsCommonState } from '../../common/runtime_types/alert_rules/common';
import { AlertStatusMetaData } from './status_rule/queries/query_monitor_status_alert';
import { AlertOverviewStatus, StaleDownConfig } from './status_rule/status_rule_executor';

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';
const monitorName = 'test-monitor';
const monitorId = '12345';
const configId = '56789';

describe('updateState', () => {
  let spy: jest.SpyInstance<string, []>;
  jest.useFakeTimers().setSystemTime(new Date('2023-02-26T00:00:00.000Z'));
  beforeEach(() => {
    spy = jest.spyOn(Date.prototype, 'toISOString');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('sets initial state values', () => {
    const result = updateState({} as SyntheticsCommonState, false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "2023-02-26T00:00:00.000Z",
        "firstTriggeredAt": undefined,
        "isTriggered": false,
        "lastCheckedAt": "2023-02-26T00:00:00.000Z",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": undefined,
        "meta": Object {},
      }
    `);
  });

  it('updates the correct field in subsequent calls', () => {
    spy
      .mockImplementationOnce(() => 'first date string')
      .mockImplementationOnce(() => 'second date string');
    const firstState = updateState({} as SyntheticsCommonState, false);
    const secondState = updateState(firstState, true);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(firstState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": undefined,
        "isTriggered": false,
        "lastCheckedAt": "first date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": undefined,
        "meta": Object {},
      }
    `);
    expect(secondState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "second date string",
        "isTriggered": true,
        "lastCheckedAt": "second date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": "second date string",
        "meta": undefined,
      }
    `);
  });

  it('correctly marks resolution times', () => {
    spy
      .mockImplementationOnce(() => 'first date string')
      .mockImplementationOnce(() => 'second date string')
      .mockImplementationOnce(() => 'third date string');
    const firstState = updateState({} as SyntheticsCommonState, true);
    const secondState = updateState(firstState, true);
    const thirdState = updateState(secondState, false);
    expect(spy).toHaveBeenCalledTimes(3);
    expect(firstState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "first date string",
        "isTriggered": true,
        "lastCheckedAt": "first date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": "first date string",
        "meta": Object {},
      }
    `);
    expect(secondState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "first date string",
        "isTriggered": true,
        "lastCheckedAt": "second date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": "second date string",
        "meta": undefined,
      }
    `);
    expect(thirdState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "first date string",
        "isTriggered": false,
        "lastCheckedAt": "third date string",
        "lastResolvedAt": "third date string",
        "lastTriggeredAt": "second date string",
        "meta": undefined,
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
    const firstState = updateState({} as SyntheticsCommonState, false);
    const secondState = updateState(firstState, true);
    const thirdState = updateState(secondState, false);
    const fourthState = updateState(thirdState, true);
    const fifthState = updateState(fourthState, false);
    expect(spy).toHaveBeenCalledTimes(5);
    expect(firstState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": undefined,
        "isTriggered": false,
        "lastCheckedAt": "first date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": undefined,
        "meta": Object {},
      }
    `);
    expect(secondState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "second date string",
        "isTriggered": true,
        "lastCheckedAt": "second date string",
        "lastResolvedAt": undefined,
        "lastTriggeredAt": "second date string",
        "meta": undefined,
      }
    `);
    expect(thirdState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "second date string",
        "isTriggered": false,
        "lastCheckedAt": "third date string",
        "lastResolvedAt": "third date string",
        "lastTriggeredAt": "second date string",
        "meta": undefined,
      }
    `);
    expect(fourthState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "second date string",
        "isTriggered": true,
        "lastCheckedAt": "fourth date string",
        "lastResolvedAt": "third date string",
        "lastTriggeredAt": "fourth date string",
        "meta": undefined,
      }
    `);
    expect(fifthState).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "first date string",
        "firstTriggeredAt": "second date string",
        "isTriggered": false,
        "lastCheckedAt": "fifth date string",
        "lastResolvedAt": "fifth date string",
        "lastTriggeredAt": "fourth date string",
        "meta": undefined,
      }
    `);
  });
});

describe('setRecoveredAlertsContext', () => {
  const alertUuid = 'alert-id';
  const location = 'us_west';
  const idWithLocation = `${configId}-${location}`;
  const basePath = {
    publicBaseUrl: 'https://localhost:5601',
  } as IBasePath;

  const upConfigs: AlertOverviewStatus['upConfigs'] = {
    [idWithLocation]: {
      configId,
      monitorQueryId: 'stale-config',
      status: 'up',
      locationId: '',
      ping: {
        '@timestamp': new Date().toISOString(),
        state: {
          ends: {
            id: '123456',
          },
        },
        monitor: {
          name: monitorName,
        },
      } as StaleDownConfig['ping'],
      timestamp: new Date().toISOString(),
      checks: {
        downWithinXChecks: 1,
        down: 0,
      },
    },
  };

  it('sets context correctly when monitor is deleted', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getUuid: () => alertUuid,
            getId: () => idWithLocation,
            getState: () => ({
              downThreshold: 1,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            configId,
            downThreshold: 1,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        locationId: 'location',
        ping: {
          '@timestamp': new Date().toISOString(),
          state: {
            id: '123456',
          },
          monitor: {
            name: monitorName,
          },
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isDeleted: true,
        checks: {
          downWithinXChecks: 1,
          down: 1,
        },
      },
    };
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {},
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        configId,
        linkMessage: '',
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        recoveryReason: 'has been deleted',
        recoveryStatus: 'has been deleted',
        monitorUrl: '(unavailable)',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: '123456',
        status: 'recovered',
        locationId: location,
        idWithLocation,
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
      },
    });
  });

  it('sets context correctly when location is removed', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getUuid: () => alertUuid,
            getId: () => idWithLocation,
            getState: () => ({
              downThreshold: 1,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        locationId: 'location',
        ping: {
          '@timestamp': new Date().toISOString(),
          state: {
            id: '123456',
          },
          monitor: {
            name: 'test-monitor',
          },
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isLocationRemoved: true,
        checks: {
          downWithinXChecks: 1,
          down: 1,
        },
      },
    };
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {},
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        monitorUrl: '(unavailable)',
        idWithLocation,
        linkMessage: '',
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        recoveryReason: 'this location has been removed from the monitor',
        recoveryStatus: 'has recovered',
        stateId: '123456',
        status: 'recovered',
        monitorUrlLabel: 'URL',
        timestamp: '2023-02-26T00:00:00.000Z',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        locationId: location,
        downThreshold: 1,
      },
    });
  });

  it('sets context correctly when monitor is up', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => idWithLocation,
            getUuid: () => alertUuid,
            getState: () => ({
              downThreshold: 1,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        locationId: location,
        ping: {
          state: {
            id: '123456',
          },
          '@timestamp': new Date().toISOString(),
          monitor: {
            name: 'test-monitor',
          },
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isLocationRemoved: true,
        checks: {
          downWithinXChecks: 1,
          down: 1,
        },
      },
    };
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs,
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {},
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        status: 'up',
        recoveryReason:
          'the monitor is now up again. It ran successfully at Feb 26, 2023 @ 00:00:00.000',
        recoveryStatus: 'is now up',
        locationId: location,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        linkMessage: `- Link: https://localhost:5601/app/synthetics/monitor/${configId}/errors/123456?locationId=us_west`,
        monitorUrl: '(unavailable)',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: null,
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
      },
    });
  });

  it('sets the correct default recovery summary', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => idWithLocation,
            getUuid: () => alertUuid,
            getState: () => ({
              downThreshold: 1,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            'monitor.name': monitorName,
            'monitor.id': monitorId,
            '@timestamp': new Date().toISOString(),
            'observer.geo.name': 'Unnamed-location',
            'observer.name.keyword': 'Unnamed-location-id',
            'monitor.type': 'HTTP',
            'error.message': 'test-error-message',
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {},
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        monitorId,
        status: 'recovered',
        recoveryReason: 'the alert condition is no longer met',
        recoveryStatus: 'has recovered',
        locationId: location,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        linkMessage: '',
        // linkMessage:
        //   '- Link: https://localhost:5601/app/synthetics/monitor/12345/errors/123456?locationId=us_west',
        monitorUrl: '(unavailable)',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: null,
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
        locationNames: 'Unnamed-location',
        locationName: 'Unnamed-location',
        lastErrorMessage: 'test-error-message',
        monitorType: 'HTTP',
      },
    });
  });

  it('sets the recovery summary for recovered custom alerts', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => idWithLocation,
            getUuid: () => alertUuid,
            getState: () => ({
              downThreshold: 1,
              configId,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            'monitor.name': monitorName,
            'monitor.id': monitorId,
            '@timestamp': new Date().toISOString(),
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {
        [idWithLocation]: {
          configId,
          monitorQueryId: monitorId,
          status: 'down',
          locationId: 'location',
          ping: {
            '@timestamp': new Date().toISOString(),
            config_id: configId,
            state: {
              id: '123456',
              checks: 1,
              duration_ms: 1000,
              ends: null,
              started_at: '2023-02-26T00:00:00.000Z',
              up: 0,
              down: 1,
              status: 'down',
            },
            summary: {
              up: 0,
              down: 1,
            },
            monitor: {
              name: monitorName,
              config_id: configId,
              id: monitorId,
              check_group: 'test-check-group',
              timespan: {
                gte: 'now-15m',
                lt: 'now',
              },
              status: 'down',
              type: 'HTTP',
            },
            observer: {
              geo: {
                name: 'Unnamed-location',
              },
            },
            url: {
              full: 'http://test_url.com',
            },
            agent: {
              name: 'test-agent',
              ephemeral_id: '1234',
              id: '1234',
              type: 'test-type',
              version: 'test-version',
            },
            error: {
              message: 'test-error-message',
            },
          } as AlertStatusMetaData['ping'],
          timestamp: new Date().toISOString(),
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      },
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        monitorId,
        status: 'recovered',
        recoveryReason: 'the alert condition is no longer met',
        recoveryStatus: 'has recovered',
        locationId: location,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        linkMessage: '',
        // linkMessage:
        //   '- Link: https://localhost:5601/app/synthetics/monitor/12345/errors/123456?locationId=us_west',
        monitorUrl: 'http://test_url.com',
        hostName: 'test-agent',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: '123456',
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
        locationNames: 'Unnamed-location',
        locationName: 'Unnamed-location',
        monitorType: 'HTTP',
        lastErrorMessage: 'test-error-message',
      },
    });
  });

  it('prefers info from previous down monitor, and falls back to alert hit info when information from down monitor is limited', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => idWithLocation,
            getUuid: () => alertUuid,
            getState: () => ({
              downThreshold: 1,
              configId,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            'monitor.name': monitorName,
            'monitor.id': monitorId,
            '@timestamp': new Date().toISOString(),
            'observer.geo.name': 'Unnamed-location',
            'error.message': 'test-error-message',
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: true,
      previousDownConfigs: {
        [idWithLocation]: {
          configId,
          monitorQueryId: monitorId,
          status: 'down',
          locationId: 'location',
          ping: {
            '@timestamp': new Date().toISOString(),
            config_id: configId,
            state: {
              id: '123456',
              checks: 1,
              duration_ms: 1000,
              ends: null,
              started_at: '2023-02-26T00:00:00.000Z',
              up: 0,
              down: 1,
              status: 'down',
            },
            summary: {
              up: 0,
              down: 1,
            },
            monitor: {
              name: monitorName,
              config_id: configId,
              id: monitorId,
              check_group: 'test-check-group',
              timespan: {
                gte: 'now-15m',
                lt: 'now',
              },
              status: 'down',
              type: 'HTTP',
            },
            observer: {
              geo: {
                name: 'us-central',
              },
            },
            url: {
              full: 'http://test_url.com',
            },
            agent: {
              name: 'test-agent',
              ephemeral_id: '1234',
              id: '1234',
              type: 'test-type',
              version: 'test-version',
            },
          } as unknown as AlertStatusMetaData['ping'], // deliberately incorrect type
          timestamp: new Date().toISOString(),
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      },
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        monitorId,
        status: 'recovered',
        recoveryReason: 'the alert condition is no longer met',
        recoveryStatus: 'has recovered',
        locationId: location,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        linkMessage: '',
        // linkMessage:
        //   '- Link: https://localhost:5601/app/synthetics/monitor/12345/errors/123456?locationId=us_west',
        monitorUrl: 'http://test_url.com',
        hostName: 'test-agent',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from us-central is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: '123456',
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
        locationNames: 'us-central',
        locationName: 'us-central',
        monitorType: 'HTTP',
        lastErrorMessage: 'test-error-message',
      },
    });
  });

  it('handles ungrouped recoveries', () => {
    const alertsClientMock = {
      report: jest.fn(),
      getAlertLimitValue: jest.fn().mockReturnValue(10),
      setAlertLimitReached: jest.fn(),
      getRecoveredAlerts: jest.fn().mockReturnValue([
        {
          alert: {
            getId: () => idWithLocation,
            getUuid: () => alertUuid,
            getState: () => ({
              downThreshold: 1,
              configId,
            }),
            setContext: jest.fn(),
          },
          hit: {
            'kibana.alert.instance.id': idWithLocation,
            'location.id': location,
            'monitor.name': monitorName,
            'monitor.id': monitorId,
            '@timestamp': new Date().toISOString(),
            'observer.geo.name': 'Unnamed-location',
            'error.message': 'test-error-message',
            configId,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs: AlertOverviewStatus['staleDownConfigs'] = {};
    setRecoveredAlertsContext({
      alertsClient: alertsClientMock,
      basePath,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
      dateFormat,
      tz: 'UTC',
      condition: {
        window: {
          numberOfChecks: 1,
        },
        locationsThreshold: 1,
        downThreshold: 1,
      },
      groupByLocation: false,
      previousDownConfigs: {
        [idWithLocation]: {
          configId,
          monitorQueryId: monitorId,
          status: 'down',
          locationId: 'location',
          ping: {
            '@timestamp': new Date().toISOString(),
            config_id: configId,
            state: {
              id: '123456',
              checks: 1,
              duration_ms: 1000,
              ends: null,
              started_at: '2023-02-26T00:00:00.000Z',
              up: 0,
              down: 1,
              status: 'down',
            },
            summary: {
              up: 0,
              down: 1,
            },
            monitor: {
              name: monitorName,
              config_id: configId,
              id: monitorId,
              check_group: 'test-check-group',
              timespan: {
                gte: 'now-15m',
                lt: 'now',
              },
              status: 'down',
              type: 'HTTP',
            },
            observer: {
              geo: {
                name: 'us-central',
              },
            },
            url: {
              full: 'http://test_url.com',
            },
            agent: {
              name: 'test-agent',
              ephemeral_id: '1234',
              id: '1234',
              type: 'test-type',
              version: 'test-version',
            },
          } as unknown as AlertStatusMetaData['ping'], // deliberately incorrect type
          timestamp: new Date().toISOString(),
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
        [`${configId}-us-east`]: {
          configId,
          monitorQueryId: monitorId,
          status: 'down',
          locationId: 'location',
          ping: {
            '@timestamp': new Date().toISOString(),
            config_id: configId,
            state: {
              id: '123456',
              checks: 1,
              duration_ms: 1000,
              ends: null,
              started_at: '2023-02-26T00:00:00.000Z',
              up: 0,
              down: 1,
              status: 'down',
            },
            summary: {
              up: 0,
              down: 1,
            },
            monitor: {
              name: monitorName,
              config_id: configId,
              id: monitorId,
              check_group: 'test-check-group',
              timespan: {
                gte: 'now-15m',
                lt: 'now',
              },
              status: 'down',
              type: 'HTTP',
            },
            observer: {
              name: 'us-east-id',
              geo: {
                name: 'us-east',
              },
            },
            url: {
              full: 'http://test_url.com',
            },
            agent: {
              name: 'test-agent',
              ephemeral_id: '1234',
              id: '1234',
              type: 'test-type',
              version: 'test-version',
            },
          } as AlertStatusMetaData['ping'],
          timestamp: new Date().toISOString(),
          checks: {
            downWithinXChecks: 1,
            down: 1,
          },
        },
      },
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: idWithLocation,
      context: {
        configId,
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName,
        monitorId,
        status: 'recovered',
        recoveryReason: 'the alert condition is no longer met',
        recoveryStatus: 'has recovered',
        locationId: location,
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        checks: { down: 1, downWithinXChecks: 1 },
        linkMessage: '',
        // linkMessage:
        //   '- Link: https://localhost:5601/app/synthetics/monitor/12345/errors/123456?locationId=us_west',
        monitorUrl: 'http://test_url.com',
        hostName: 'test-agent',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from us-central is recovered. Checked at February 25, 2023 7:00 PM. Monitor is down 1 time within the last 1 checks. Alert when 1 out of the last 1 checks are down from at least 1 location.',
        stateId: '123456',
        timestamp: '2023-02-26T00:00:00.000Z',
        downThreshold: 1,
        locationNames: 'us-central | us-east',
        locationName: 'us-central | us-east',
        monitorType: 'HTTP',
        lastErrorMessage: 'test-error-message',
      },
    });
  });
});
