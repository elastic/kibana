/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType, RecoveredActionGroup } from '../common';
import { httpServiceMock } from '../../../../src/core/public/mocks';
import { loadAlert, loadAlertType, loadAlertTypes } from './alert_api';
import uuid from 'uuid';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadAlertTypes', () => {
  test('should call get alert types API', async () => {
    const resolvedValue: AlertType[] = [
      {
        id: 'test',
        name: 'Test',
        actionVariables: ['var1'],
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        minimumLicenseRequired: 'basic',
        isExportable: true,
        recoveryActionGroup: RecoveredActionGroup,
        producer: 'alerts',
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/list_alert_types",
      ]
    `);
  });
});

describe('loadAlertType', () => {
  test('should call get alert types API', async () => {
    const alertType: AlertType = {
      id: 'test',
      name: 'Test',
      actionVariables: ['var1'],
      actionGroups: [{ id: 'default', name: 'Default' }],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      producer: 'alerts',
    };
    http.get.mockResolvedValueOnce([alertType]);

    await loadAlertType({ http, id: alertType.id });

    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/list_alert_types",
      ]
    `);
  });

  test('should find the required alertType', async () => {
    const alertType: AlertType = {
      id: 'test-another',
      name: 'Test Another',
      actionVariables: [],
      actionGroups: [{ id: 'default', name: 'Default' }],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: true,
      recoveryActionGroup: RecoveredActionGroup,
      producer: 'alerts',
    };
    http.get.mockResolvedValueOnce([alertType]);

    expect(await loadAlertType({ http, id: 'test-another' })).toEqual(alertType);
  });
});

describe('loadAlert', () => {
  test('should call get API with base parameters', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      id: alertId,
      name: 'name',
      tags: [],
      enabled: true,
      alertTypeId: '.noop',
      schedule: { interval: '1s' },
      actions: [],
      params: {},
      createdBy: null,
      updatedBy: null,
      throttle: null,
      muteAll: false,
      mutedInstanceIds: [],
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlert({ http, alertId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}`);
  });
});
