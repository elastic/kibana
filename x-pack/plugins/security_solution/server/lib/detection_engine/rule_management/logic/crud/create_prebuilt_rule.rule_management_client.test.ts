/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { RulesManagementClient } from './rules_management_client';

import { getPrebuiltRuleAsset } from '../../../rule_schema/mocks';

describe('RuleManagementClient.createCustomRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let rulesManagementClient: RulesManagementClient;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    rulesManagementClient = new RulesManagementClient(rulesClient);
  });

  it('should create a prebuilt rule with the correct parameters', async () => {
    const ruleAsset = getPrebuiltRuleAsset();

    await rulesManagementClient.createPrebuiltRule({ ruleAsset });

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: ruleAsset.name,
          enabled: false,
          params: expect.objectContaining({
            ruleId: ruleAsset.rule_id,
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });
});
