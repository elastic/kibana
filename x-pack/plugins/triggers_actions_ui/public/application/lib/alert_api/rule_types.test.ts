/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType } from '../../../types';
import { httpServiceMock } from '../../../../../../../src/core/public/mocks';
import { loadAlertTypes } from './rule_types';
import { ALERTS_FEATURE_ID } from '../../../../../alerting/common';

const http = httpServiceMock.createStartContract();

describe('loadAlertTypes', () => {
  test('should call get alert types API', async () => {
    const resolvedValue: AlertType[] = [
      {
        id: 'test',
        name: 'Test',
        actionVariables: {
          context: [{ name: 'var1', description: 'val1' }],
          state: [{ name: 'var2', description: 'val2' }],
          params: [{ name: 'var3', description: 'val3' }],
        },
        producer: ALERTS_FEATURE_ID,
        actionGroups: [{ id: 'default', name: 'Default' }],
        recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
        defaultActionGroupId: 'default',
        authorizedConsumers: {},
        minimumLicenseRequired: 'basic',
        enabledInLicense: true,
      },
    ];
    http.get.mockResolvedValueOnce(resolvedValue);

    const result = await loadAlertTypes({ http });
    expect(result).toEqual(resolvedValue);
    expect(http.get.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "/api/alerting/rule_types",
      ]
    `);
  });
});
