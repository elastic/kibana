/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleType } from '../../types';
import { checkRuleTypeEnabled } from './check_rule_type_enabled';

describe('checkRuleTypeEnabled', () => {
  test(`returns isEnabled:true when rule type isn't provided`, async () => {
    expect(checkRuleTypeEnabled()).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:true when rule type is enabled', async () => {
    const alertType: RuleType = {
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
    expect(checkRuleTypeEnabled(alertType)).toMatchInlineSnapshot(`
          Object {
            "isEnabled": true,
          }
      `);
  });

  test('returns isEnabled:false when rule type is disabled by license', async () => {
    const alertType: RuleType = {
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
    expect(checkRuleTypeEnabled(alertType)).toMatchInlineSnapshot(`
      Object {
        "isEnabled": false,
        "message": "This rule type requires a Gold license.",
      }
    `);
  });
});
