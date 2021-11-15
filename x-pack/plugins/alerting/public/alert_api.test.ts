/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType, RecoveredActionGroup } from '../common';
import { httpServiceMock } from '../../../../src/core/public/mocks';
import { loadRule, loadRuleTypes } from './alert_api';
import uuid from 'uuid';

const http = httpServiceMock.createStartContract();

beforeEach(() => jest.resetAllMocks());

describe('loadRuleTypes', () => {
  test('should call get rule types API', async () => {
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

    const result = await loadRuleTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerts/list_alert_types",
      ]
    `);
  });
});

describe('loadRule', () => {
  test('should call get API with base parameters', async () => {
    const ruleId = uuid.v4();
    const resolvedValue = {
      id: ruleId,
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

    expect(await loadRule({ http, ruleId })).toEqual(resolvedValue);
    expect(http.get).toHaveBeenCalledWith(`/api/alerts/alert/${ruleId}`);
  });
});
