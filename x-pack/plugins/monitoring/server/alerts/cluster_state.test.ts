/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Logger } from 'src/core/server';
import { getClusterState } from './cluster_state';
import { ALERT_TYPE_CLUSTER_STATE } from '../../common/constants';
import { AlertCommonParams, AlertCommonState, AlertClusterStatePerClusterState } from './types';
import { getPreparedAlert } from '../lib/alerts/get_prepared_alert';
import { executeActions } from '../lib/alerts/cluster_state.lib';
import { AlertClusterStateState } from './enums';
import { alertsMock, AlertServicesMock } from '../../../alerts/server/mocks';

jest.mock('../lib/alerts/cluster_state.lib', () => ({
  executeActions: jest.fn(),
  getUiMessage: jest.fn(),
}));

jest.mock('../lib/alerts/get_prepared_alert', () => ({
  getPreparedAlert: jest.fn(() => {
    return {
      emailAddress: 'foo@foo.com',
    };
  }),
}));

describe('getClusterState', () => {
  const services: AlertServicesMock = alertsMock.createAlertServices();

  const params: AlertCommonParams = {
    dateFormat: 'YYYY',
    timezone: 'UTC',
  };

  const emailAddress = 'foo@foo.com';
  const clusterUuid = 'kdksdfj434';
  const clusterName = 'monitoring_test';
  const cluster = { clusterUuid, clusterName };

  async function setupAlert(
    previousState: AlertClusterStateState,
    newState: AlertClusterStateState
  ): Promise<AlertCommonState> {
    const logger: Logger = {
      warn: jest.fn(),
      log: jest.fn(),
      debug: jest.fn(),
      trace: jest.fn(),
      error: jest.fn(),
      fatal: jest.fn(),
      info: jest.fn(),
      get: jest.fn(),
    };
    const getLogger = (): Logger => logger;
    const ccrEnabled = false;
    (getPreparedAlert as jest.Mock).mockImplementation(() => ({
      emailAddress,
      data: [
        {
          state: newState,
          clusterUuid,
        },
      ],
      clusters: [cluster],
    }));

    const alert = getClusterState(null as any, null as any, getLogger, ccrEnabled);
    const state: AlertCommonState = {
      [clusterUuid]: {
        state: previousState,
        ui: {
          isFiring: false,
          severity: 0,
          message: null,
          resolvedMS: 0,
          lastCheckedMS: 0,
          triggeredMS: 0,
        },
      } as AlertClusterStatePerClusterState,
    };

    return (await alert.executor({ services, params, state } as any)) as AlertCommonState;
  }

  afterEach(() => {
    (executeActions as jest.Mock).mockClear();
  });

  it('should configure the alert properly', () => {
    const alert = getClusterState(null as any, null as any, jest.fn(), false);
    expect(alert.id).toBe(ALERT_TYPE_CLUSTER_STATE);
    expect(alert.actionGroups).toEqual([{ id: 'default', name: 'Default' }]);
  });

  it('should alert if green -> yellow', async () => {
    const result = await setupAlert(AlertClusterStateState.Green, AlertClusterStateState.Yellow);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE),
      cluster,
      AlertClusterStateState.Yellow,
      emailAddress
    );
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Yellow);
    expect(clusterResult.ui.isFiring).toBe(true);
    expect(clusterResult.ui.resolvedMS).toBe(0);
  });

  it('should alert if yellow -> green', async () => {
    const result = await setupAlert(AlertClusterStateState.Yellow, AlertClusterStateState.Green);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE),
      cluster,
      AlertClusterStateState.Green,
      emailAddress,
      true
    );
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Green);
    expect(clusterResult.ui.resolvedMS).toBeGreaterThan(0);
  });

  it('should alert if green -> red', async () => {
    const result = await setupAlert(AlertClusterStateState.Green, AlertClusterStateState.Red);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE),
      cluster,
      AlertClusterStateState.Red,
      emailAddress
    );
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Red);
    expect(clusterResult.ui.isFiring).toBe(true);
    expect(clusterResult.ui.resolvedMS).toBe(0);
  });

  it('should alert if red -> green', async () => {
    const result = await setupAlert(AlertClusterStateState.Red, AlertClusterStateState.Green);
    expect(executeActions).toHaveBeenCalledWith(
      services.alertInstanceFactory(ALERT_TYPE_CLUSTER_STATE),
      cluster,
      AlertClusterStateState.Green,
      emailAddress,
      true
    );
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Green);
    expect(clusterResult.ui.resolvedMS).toBeGreaterThan(0);
  });

  it('should not alert if red -> yellow', async () => {
    const result = await setupAlert(AlertClusterStateState.Red, AlertClusterStateState.Yellow);
    expect(executeActions).not.toHaveBeenCalled();
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Red);
    expect(clusterResult.ui.resolvedMS).toBe(0);
  });

  it('should not alert if yellow -> red', async () => {
    const result = await setupAlert(AlertClusterStateState.Yellow, AlertClusterStateState.Red);
    expect(executeActions).not.toHaveBeenCalled();
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Yellow);
    expect(clusterResult.ui.resolvedMS).toBe(0);
  });

  it('should not alert if green -> green', async () => {
    const result = await setupAlert(AlertClusterStateState.Green, AlertClusterStateState.Green);
    expect(executeActions).not.toHaveBeenCalled();
    const clusterResult = result[clusterUuid] as AlertClusterStatePerClusterState;
    expect(clusterResult.state).toBe(AlertClusterStateState.Green);
    expect(clusterResult.ui.resolvedMS).toBe(0);
  });
});
