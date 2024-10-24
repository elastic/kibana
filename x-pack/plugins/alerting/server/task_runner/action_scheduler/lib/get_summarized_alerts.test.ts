/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSummarizedAlerts } from './get_summarized_alerts';
import { alertsClientMock } from '../../../alerts_client/alerts_client.mock';
import { mockAAD } from '../../fixtures';
import { ALERT_UUID } from '@kbn/rule-data-utils';
import { generateAlert } from '../test_fixtures';
import { getErrorSource } from '@kbn/task-manager-plugin/server/task_running';

const alertsClient = alertsClientMock.create();

describe('getSummarizedAlerts', () => {
  const newAlert1 = generateAlert({ id: 1 });
  const newAlert2 = generateAlert({ id: 2 });
  const alerts = { ...newAlert1, ...newAlert2 };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should call alertsClient.getSummarizedAlerts with the correct params', async () => {
    const summarizedAlerts = {
      new: {
        count: 2,
        data: [
          { ...mockAAD, [ALERT_UUID]: alerts[1].getUuid() },
          { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
        ],
      },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    };
    alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
    alertsClient.getProcessedAlerts.mockReturnValue(alerts);
    const result = await getSummarizedAlerts({
      alertsClient,
      queryOptions: {
        excludedAlertInstanceIds: [],
        executionUuid: '123xyz',
        ruleId: '1',
        spaceId: 'test1',
      },
    });

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      excludedAlertInstanceIds: [],
      executionUuid: '123xyz',
      ruleId: '1',
      spaceId: 'test1',
    });

    expect(result).toEqual({
      ...summarizedAlerts,
      all: summarizedAlerts.new,
    });
  });

  test('should throw error if alertsClient.getSummarizedAlerts throws error', async () => {
    alertsClient.getSummarizedAlerts.mockImplementation(() => {
      throw new Error('cannot get summarized alerts');
    });

    try {
      await getSummarizedAlerts({
        alertsClient,
        queryOptions: {
          excludedAlertInstanceIds: [],
          executionUuid: '123xyz',
          ruleId: '1',
          spaceId: 'test1',
        },
      });
    } catch (err) {
      expect(getErrorSource(err)).toBe('framework');
      expect(err.message).toBe('cannot get summarized alerts');
    }
  });

  test('should remove alert from summarized alerts if it is new and has a maintenance window', async () => {
    const newAlertWithMaintenanceWindow = generateAlert({
      id: 1,
      maintenanceWindowIds: ['mw-1'],
    });
    const alertsWithMaintenanceWindow = { ...newAlertWithMaintenanceWindow, ...newAlert2 };

    const newAADAlerts = [
      { ...mockAAD, [ALERT_UUID]: newAlertWithMaintenanceWindow[1].getUuid() },
      { ...mockAAD, [ALERT_UUID]: alerts[2].getUuid() },
    ];
    const summarizedAlerts = {
      new: { count: 2, data: newAADAlerts },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
    };
    alertsClient.getSummarizedAlerts.mockResolvedValue(summarizedAlerts);
    alertsClient.getProcessedAlerts.mockReturnValue(alertsWithMaintenanceWindow);

    const result = await getSummarizedAlerts({
      alertsClient,
      queryOptions: {
        excludedAlertInstanceIds: [],
        executionUuid: '123xyz',
        ruleId: '1',
        spaceId: 'test1',
      },
    });

    expect(alertsClient.getSummarizedAlerts).toHaveBeenCalledWith({
      excludedAlertInstanceIds: [],
      executionUuid: '123xyz',
      ruleId: '1',
      spaceId: 'test1',
    });

    expect(result).toEqual({
      new: { count: 1, data: [newAADAlerts[1]] },
      ongoing: { count: 0, data: [] },
      recovered: { count: 0, data: [] },
      all: { count: 1, data: [newAADAlerts[1]] },
    });
  });
});
