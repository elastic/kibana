/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertType } from '../common';
import { httpServiceMock } from '../../../../src/core/public/mocks';
import { loadAlert, loadAlertState, loadAlertType, loadAlertTypes } from './alert_api';
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
        producer: 'alerting',
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
      producer: 'alerting',
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
      producer: 'alerting',
    };
    http.get.mockResolvedValueOnce([alertType]);

    expect(await loadAlertType({ http, id: 'test-another' })).toEqual(alertType);
  });

  test('should throw if required alertType is missing', async () => {
    http.get.mockResolvedValueOnce([
      {
        id: 'test-another',
        name: 'Test Another',
        actionVariables: [],
        actionGroups: [{ id: 'default', name: 'Default' }],
        defaultActionGroupId: 'default',
        producer: 'alerting',
      },
    ]);

    expect(loadAlertType({ http, id: 'test' })).rejects.toMatchInlineSnapshot(
      `[Error: Alert type "test" is not registered.]`
    );
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

describe('loadAlertState', () => {
  test('should call get API with base parameters', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {},
        second_instance: {},
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlertState({ http, alertId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });

  test('should parse AlertInstances', async () => {
    const alertId = uuid.v4();
    const resolvedValue = {
      alertTypeState: {
        some: 'value',
      },
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: '2020-02-09T23:15:41.941Z',
            },
          },
        },
      },
    };
    http.get.mockResolvedValueOnce(resolvedValue);

    expect(await loadAlertState({ http, alertId })).toEqual({
      ...resolvedValue,
      alertInstances: {
        first_instance: {
          state: {},
          meta: {
            lastScheduledActions: {
              group: 'first_group',
              date: new Date('2020-02-09T23:15:41.941Z'),
            },
          },
        },
      },
    });
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });

  test('should handle empty response from api', async () => {
    const alertId = uuid.v4();
    http.get.mockResolvedValueOnce('');

    expect(await loadAlertState({ http, alertId })).toEqual({});
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${alertId}/state`);
  });
});
