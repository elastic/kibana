/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fetchStatus } from './fetch_status';
import { AlertUiState, AlertState } from '../../../common/types/alerts';
import { AlertSeverity } from '../../../common/enums';
import {
  RULE_CPU_USAGE,
  RULE_CLUSTER_HEALTH,
  RULE_DISK_USAGE,
  RULE_MISSING_MONITORING_DATA,
} from '../../../common/constants';

jest.mock('../../static_globals', () => ({
  Globals: {
    app: {
      getLogger: jest.fn(),
      config: {
        ui: {
          ccs: { enabled: true, remotePatterns: '*' },
          container: { elasticsearch: { enabled: false } },
        },
      },
    },
  },
}));

describe('fetchStatus', () => {
  const alertType = RULE_CPU_USAGE;
  const alertTypes = [alertType];
  const defaultClusterState = {
    clusterUuid: 'abc',
    clusterName: 'test',
  };
  const defaultUiState: AlertUiState = {
    isFiring: false,
    severity: AlertSeverity.Success,
    message: null,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };
  let alertStates: AlertState[] = [];
  const rulesClient = {
    find: jest.fn(() => ({
      total: 1,
      data: [
        {
          id: 1,
        },
        {
          id: 2,
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
    (rulesClient.find as jest.Mock).mockClear();
    (rulesClient.getAlertState as jest.Mock).mockClear();
    alertStates.length = 0;
  });

  it('should fetch from the alerts client', async () => {
    const status = await fetchStatus(rulesClient as any, alertTypes, [
      defaultClusterState.clusterUuid,
    ]);
    expect(status).toEqual({
      monitoring_alert_cpu_usage: [
        {
          sanitizedRule: { id: 1 },
          states: [],
        },
        {
          sanitizedRule: { id: 2 },
          states: [],
        },
      ],
    });
  });

  it('should return alerts that are firing', async () => {
    alertStates = [
      {
        cluster: defaultClusterState,
        ui: {
          ...defaultUiState,
          isFiring: true,
        },
      },
    ];

    const status = await fetchStatus(rulesClient as any, alertTypes, [
      defaultClusterState.clusterUuid,
    ]);
    expect(Object.values(status).length).toBe(1);
    expect(Object.keys(status)).toEqual(alertTypes);
    expect(status[alertType][0].states[0].state.ui.isFiring).toBe(true);
  });

  it('should pass in the right filter to the alerts client', async () => {
    await fetchStatus(rulesClient as any, alertTypes, [defaultClusterState.clusterUuid]);
    expect((rulesClient.find as jest.Mock).mock.calls[0][0].options.filter).toBe(
      `alert.attributes.alertTypeId:${alertType}`
    );
  });

  it('should return nothing if no alert state is found', async () => {
    rulesClient.getAlertState = jest.fn(() => ({
      alertTypeState: null,
    })) as any;

    const status = await fetchStatus(rulesClient as any, alertTypes, [
      defaultClusterState.clusterUuid,
    ]);
    expect(status[alertType][0].states.length).toEqual(0);
  });

  it('should return nothing if no alerts are found', async () => {
    rulesClient.find = jest.fn(() => ({
      total: 0,
      data: [],
    })) as any;

    const status = await fetchStatus(rulesClient as any, alertTypes, [
      defaultClusterState.clusterUuid,
    ]);
    expect(status).toEqual({});
  });

  // seems to only work with it.only(), holding state somewhere
  it.skip('should pass along the license service', async () => {
    const customLicenseService = {
      getWatcherFeature: jest.fn().mockImplementation(() => ({
        isAvailable: true,
        isEnabled: true,
      })),
    };
    await fetchStatus(rulesClient as any, [RULE_CLUSTER_HEALTH], [defaultClusterState.clusterUuid]);
    expect(customLicenseService.getWatcherFeature).toHaveBeenCalled();
  });

  it('should sort the alerts', async () => {
    const customRulesClient = {
      find: jest.fn(() => ({
        total: 1,
        data: [
          {
            id: 1,
          },
        ],
      })),
      getAlertState: jest.fn(() => ({
        alertInstances: {
          abc: {
            state: {
              alertStates: [
                {
                  cluster: defaultClusterState,
                  ui: {
                    ...defaultUiState,
                    isFiring: true,
                  },
                },
              ],
            },
          },
        },
      })),
    };
    const status = await fetchStatus(
      customRulesClient as any,
      [RULE_CPU_USAGE, RULE_DISK_USAGE, RULE_MISSING_MONITORING_DATA],
      [defaultClusterState.clusterUuid]
    );
    expect(Object.keys(status)).toEqual([
      RULE_CPU_USAGE,
      RULE_DISK_USAGE,
      RULE_MISSING_MONITORING_DATA,
    ]);
  });
});
