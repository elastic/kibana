/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { fetchStatus } from './fetch_status';
import { AlertCommonPerClusterState } from '../../alerts/types';

describe('fetchStatus', () => {
  const alertType = 'monitoringTest';
  const log = { warn: jest.fn() };
  const start = 0;
  const end = 0;
  const id = 1;
  const defaultUiState = {
    isFiring: false,
    severity: 0,
    message: null,
    resolvedMS: 0,
    lastCheckedMS: 0,
    triggeredMS: 0,
  };
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
      alertTypeState: {
        state: {
          ui: defaultUiState,
        } as AlertCommonPerClusterState,
      },
    })),
  };

  afterEach(() => {
    (alertsClient.find as jest.Mock).mockClear();
    (alertsClient.getAlertState as jest.Mock).mockClear();
  });

  it('should fetch from the alerts client', async () => {
    const status = await fetchStatus(alertsClient as any, [alertType], start, end, log as any);
    expect(status).toEqual([]);
  });

  it('should return alerts that are firing', async () => {
    alertsClient.getAlertState = jest.fn(() => ({
      alertTypeState: {
        state: {
          ui: {
            ...defaultUiState,
            isFiring: true,
          },
        } as AlertCommonPerClusterState,
      },
    }));

    const status = await fetchStatus(alertsClient as any, [alertType], start, end, log as any);
    expect(status.length).toBe(1);
    expect(status[0].type).toBe(alertType);
    expect(status[0].isFiring).toBe(true);
  });

  it('should return alerts that have been resolved in the time period', async () => {
    alertsClient.getAlertState = jest.fn(() => ({
      alertTypeState: {
        state: {
          ui: {
            ...defaultUiState,
            resolvedMS: 1500,
          },
        } as AlertCommonPerClusterState,
      },
    }));

    const customStart = 1000;
    const customEnd = 2000;

    const status = await fetchStatus(
      alertsClient as any,
      [alertType],
      customStart,
      customEnd,
      log as any
    );
    expect(status.length).toBe(1);
    expect(status[0].type).toBe(alertType);
    expect(status[0].isFiring).toBe(false);
  });

  it('should pass in the right filter to the alerts client', async () => {
    await fetchStatus(alertsClient as any, [alertType], start, end, log as any);
    expect((alertsClient.find as jest.Mock).mock.calls[0][0].options.filter).toBe(
      `alert.attributes.alertTypeId:${alertType}`
    );
  });

  it('should return nothing if no alert state is found', async () => {
    alertsClient.getAlertState = jest.fn(() => ({
      alertTypeState: null,
    })) as any;

    const status = await fetchStatus(alertsClient as any, [alertType], start, end, log as any);
    expect(status).toEqual([]);
  });

  it('should return nothing if no alerts are found', async () => {
    alertsClient.find = jest.fn(() => ({
      total: 0,
      data: [],
    })) as any;

    const status = await fetchStatus(alertsClient as any, [alertType], start, end, log as any);
    expect(status).toEqual([]);
  });
});
