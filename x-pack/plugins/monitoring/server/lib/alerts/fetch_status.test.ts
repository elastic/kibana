/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchStatus } from './fetch_status';
import { AlertUiState, AlertState } from '../../alerts/types';
import { AlertSeverity } from '../../../common/enums';
import { ALERT_CPU_USAGE, ALERT_CLUSTER_HEALTH } from '../../../common/constants';

describe('fetchStatus', () => {
  const alertType = ALERT_CPU_USAGE;
  const alertTypes = [alertType];
  const log = { warn: jest.fn() };
  const start = 0;
  const end = 0;
  const id = 1;
  const defaultClusterState = {
    clusterUuid: 'abc',
    clusterName: 'test',
  };
  const defaultUiState: AlertUiState = {
    isFiring: false,
    severity: AlertSeverity.Success,
    message: null,
    resolvedMS: 0,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };
  let alertStates: AlertState[] = [];
  const licenseService = null;
  const alertsClient = {
    find: jest.fn(() => ({
      total: 1,
      data: [
        {
          id,
        },
      ],
    })),
    getAlertState: jest.fn(() => ({
      alertInstances: {
        abc: {
          state: {
            alertStates,
          },
        },
      },
    })),
  };

  afterEach(() => {
    (alertsClient.find as jest.Mock).mockClear();
    (alertsClient.getAlertState as jest.Mock).mockClear();
  });

  it('should fetch from the alerts client', async () => {
    const status = await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect(status).toEqual({
      monitoring_alert_cpu_usage: {
        alert: {
          isLegacy: false,
          label: 'CPU Usage',
          paramDetails: {},
          rawAlert: { id: 1 },
          type: 'monitoring_alert_cpu_usage',
        },
        enabled: true,
        exists: true,
        states: [],
      },
    });
  });

  it('should return alerts that are firing', async () => {
    alertStates = [
      {
        cluster: defaultClusterState,
        ccs: null,
        ui: {
          ...defaultUiState,
          isFiring: true,
        },
      },
    ];

    const status = await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect(Object.values(status).length).toBe(1);
    expect(Object.keys(status)).toEqual(alertTypes);
    expect(status[alertType].states[0].state.ui.isFiring).toBe(true);
  });

  it('should return alerts that have been resolved in the time period', async () => {
    alertStates = [
      {
        cluster: defaultClusterState,
        ccs: null,
        ui: {
          ...defaultUiState,
          resolvedMS: 1500,
        },
      },
    ];

    const customStart = 1000;
    const customEnd = 2000;

    const status = await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      customStart,
      customEnd,
      log as any
    );
    expect(Object.values(status).length).toBe(1);
    expect(Object.keys(status)).toEqual(alertTypes);
    expect(status[alertType].states[0].state.ui.isFiring).toBe(false);
  });

  it('should pass in the right filter to the alerts client', async () => {
    await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect((alertsClient.find as jest.Mock).mock.calls[0][0].options.filter).toBe(
      `alert.attributes.alertTypeId:${alertType}`
    );
  });

  it('should return nothing if no alert state is found', async () => {
    alertsClient.getAlertState = jest.fn(() => ({
      alertTypeState: null,
    })) as any;

    const status = await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect(status[alertType].states.length).toEqual(0);
  });

  it('should return nothing if no alerts are found', async () => {
    alertsClient.find = jest.fn(() => ({
      total: 0,
      data: [],
    })) as any;

    const status = await fetchStatus(
      alertsClient as any,
      licenseService as any,
      alertTypes,
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect(status).toEqual({});
  });

  it('should pass along the license service', async () => {
    const customLicenseService = {
      getWatcherFeature: jest.fn().mockImplementation(() => ({
        isAvailable: true,
        isEnabled: true,
      })),
    };
    await fetchStatus(
      alertsClient as any,
      customLicenseService as any,
      [ALERT_CLUSTER_HEALTH],
      defaultClusterState.clusterUuid,
      start,
      end,
      log as any
    );
    expect(customLicenseService.getWatcherFeature).toHaveBeenCalled();
  });
});
