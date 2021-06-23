/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertType } from '../../types';
import { checkAlertTypeEnabled } from './check_alert_type_enabled';

describe('checkAlertTypeEnabled', () => {
  test(`returns isEnabled:true when alert type isn't provided`, async () => {
    expect(checkAlertTypeEnabled()).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:true when alert type is enabled', async () => {
    const alertType: AlertType = {
      id: 'test',
      name: 'Test',
      actionVariables: {
        context: [{ name: 'var1', description: 'val1' }],
        state: [{ name: 'var2', description: 'val2' }],
        params: [{ name: 'var3', description: 'val3' }],
      },
      producer: 'test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      defaultActionGroupId: 'default',
      authorizedConsumers: {},
      minimumLicenseRequired: 'basic',
      enabledInLicense: true,
    };
    expect(checkAlertTypeEnabled(alertType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when alert type is disabled by license', async () => {
    const alertType: AlertType = {
      id: 'test',
      name: 'Test',
      actionVariables: {
        context: [{ name: 'var1', description: 'val1' }],
        state: [{ name: 'var2', description: 'val2' }],
        params: [{ name: 'var3', description: 'val3' }],
      },
      producer: 'test',
      actionGroups: [{ id: 'default', name: 'Default' }],
      recoveryActionGroup: { id: 'recovered', name: 'Recovered' },
      defaultActionGroupId: 'default',
      authorizedConsumers: {},
      minimumLicenseRequired: 'gold',
      enabledInLicense: false,
    };
    expect(checkAlertTypeEnabled(alertType)).toMatchInlineSnapshot(`
      Object {
        "isEnabled": false,
        "message": "This rule type requires a Gold license.",
      }
    `);
  });
});
