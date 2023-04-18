/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { alertsMock } from '@kbn/alerting-plugin/server/mocks';
import { IBasePath } from '@kbn/core/server';
import { updateState, setRecoveredAlertsContext } from './common';
import { SyntheticsCommonState } from '../../common/runtime_types/alert_rules/common';
import { StaleDownConfig } from './status_rule/status_rule_executor';

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
    const result = updateState({} as SyntheticsCommonState, false);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(result).toMatchInlineSnapshot(`
      Object {
        "firstCheckedAt": "foo date string",
        "firstTriggeredAt": undefined,
        "isTriggered": false,
        "lastCheckedAt": "foo date string",
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
  const { alertFactory } = alertsMock.createRuleExecutorServices();
  const { getRecoveredAlerts } = alertFactory.done();
  const alertUuid = 'alert-id';
  const location = 'US Central';
  const configId = '12345';
  const idWithLocation = `${configId}-${location}`;
  const basePath = {
    publicBaseUrl: 'https://localhost:5601',
  } as IBasePath;
  const getAlertUuid = () => alertUuid;

  const upConfigs = {
    [idWithLocation]: {
      configId,
      monitorQueryId: 'stale-config',
      status: 'up',
      location: '',
      ping: {
        '@timestamp': new Date().toISOString(),
      } as StaleDownConfig['ping'],
      timestamp: new Date().toISOString(),
    },
  };

  it('sets context correctly when monitor is deleted', () => {
    const setContext = jest.fn();
    getRecoveredAlerts.mockReturnValue([
      {
        getId: () => alertUuid,
        getState: () => ({
          idWithLocation,
          monitorName: 'test-monitor',
        }),
        setContext,
      },
    ]);
    const staleDownConfigs = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        location: 'location',
        ping: {
          '@timestamp': new Date().toISOString(),
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isDeleted: true,
      },
    };
    setRecoveredAlertsContext({
      alertFactory,
      basePath,
      getAlertUuid,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
    });
    expect(setContext).toBeCalledWith({
      idWithLocation,
      alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
      monitorName: 'test-monitor',
      recoveryReason: 'Monitor has been deleted',
    });
  });

  it('sets context correctly when location is removed', () => {
    const setContext = jest.fn();
    getRecoveredAlerts.mockReturnValue([
      {
        getId: () => alertUuid,
        getState: () => ({
          idWithLocation,
          monitorName: 'test-monitor',
        }),
        setContext,
      },
    ]);
    const staleDownConfigs = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        location: 'location',
        ping: {
          '@timestamp': new Date().toISOString(),
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isLocationRemoved: true,
      },
    };
    setRecoveredAlertsContext({
      alertFactory,
      basePath,
      getAlertUuid,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs: {},
    });
    expect(setContext).toBeCalledWith({
      idWithLocation,
      alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
      monitorName: 'test-monitor',
      recoveryReason: 'Location has been removed from the monitor',
    });
  });

  it('sets context correctly when monitor is up', () => {
    const setContext = jest.fn();
    getRecoveredAlerts.mockReturnValue([
      {
        getId: () => alertUuid,
        getState: () => ({
          idWithLocation,
          monitorName: 'test-monitor',
        }),
        setContext,
      },
    ]);
    const staleDownConfigs = {
      [idWithLocation]: {
        configId,
        monitorQueryId: 'stale-config',
        status: 'down',
        location: 'location',
        ping: {
          '@timestamp': new Date().toISOString(),
        } as StaleDownConfig['ping'],
        timestamp: new Date().toISOString(),
        isLocationRemoved: true,
      },
    };
    setRecoveredAlertsContext({
      alertFactory,
      basePath,
      getAlertUuid,
      spaceId: 'default',
      staleDownConfigs,
      upConfigs,
    });
    expect(setContext).toBeCalledWith({
      idWithLocation,
      alertDetailsUrl: 'https://localhost:5601/app/observability/alerts/alert-id',
      monitorName: 'test-monitor',
      status: 'up',
      recoveryReason: 'Monitor has recovered with status Up',
    });
  });
});
