/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { IBasePath } from '@kbn/core/server';
import { updateState, setRecoveredAlertsContext } from './common';
import { SyntheticsCommonState } from '../../common/runtime_types/alert_rules/common';
import { StaleDownConfig } from './status_rule/status_rule_executor';

const dateFormat = 'MMM D, YYYY @ HH:mm:ss.SSS';

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
  const location = 'US Central';
  const configId = '12345';
  const idWithLocation = `${configId}-${location}`;
  const basePath = {
    publicBaseUrl: 'https://localhost:5601',
  } as IBasePath;

  const upConfigs = {
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
          name: 'test-monitor',
        },
      } as StaleDownConfig['ping'],
      timestamp: new Date().toISOString(),
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
            getId: () => alertUuid,
            getState: () => ({
              idWithLocation,
              monitorName: 'test-monitor',
            }),
            setContext: jest.fn(),
            getUuid: () => alertUuid,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs = {
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
        isDeleted: true,
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
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: 'alert-id',
      context: {
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        configId: '12345',
        idWithLocation,
        linkMessage: '',
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName: 'test-monitor',
        recoveryReason: 'the monitor has been deleted',
        recoveryStatus: 'has been deleted',
        monitorUrl: '(unavailable)',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM.',
        stateId: '123456',
        status: 'recovered',
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
            getId: () => alertUuid,
            getState: () => ({
              idWithLocation,
              monitorName: 'test-monitor',
            }),
            setContext: jest.fn(),
            getUuid: () => alertUuid,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs = {
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
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: 'alert-id',
      context: {
        configId: '12345',
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        monitorUrl: '(unavailable)',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM.',
        idWithLocation,
        linkMessage: '',
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName: 'test-monitor',
        recoveryReason: 'this location has been removed from the monitor',
        recoveryStatus: 'has recovered',
        stateId: '123456',
        status: 'recovered',
        monitorUrlLabel: 'URL',
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
            getId: () => alertUuid,
            getState: () => ({
              idWithLocation,
              monitorName: 'test-monitor',
              locationId: 'us_west',
              configId: '12345-67891',
            }),
            setContext: jest.fn(),
            getUuid: () => alertUuid,
          },
        },
      ]),
      setAlertData: jest.fn(),
      isTrackedAlert: jest.fn(),
    };
    const staleDownConfigs = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        locationId: 'location',
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
    });
    expect(alertsClientMock.setAlertData).toBeCalledWith({
      id: 'alert-id',
      context: {
        configId: '12345-67891',
        idWithLocation,
        alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
        monitorName: 'test-monitor',
        status: 'up',
        recoveryReason:
          'the monitor is now up again. It ran successfully at Feb 26, 2023 @ 00:00:00.000',
        recoveryStatus: 'is now up',
        locationId: 'us_west',
        checkedAt: 'Feb 26, 2023 @ 00:00:00.000',
        linkMessage:
          '- Link: https://localhost:5601/app/synthetics/monitor/12345-67891/errors/123456?locationId=us_west',
        monitorUrl: '(unavailable)',
        monitorUrlLabel: 'URL',
        reason:
          'Monitor "test-monitor" from Unnamed-location is recovered. Checked at February 25, 2023 7:00 PM.',
        stateId: null,
      },
    });
  });
});
