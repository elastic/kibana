/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import type { RulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { getRuleMock, resolveRuleMock } from '../../../routes/__mocks__/request_responses';
import { getMlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';
import { getUpdateRulesOptionsMock, getUpdateMlRulesOptionsMock } from './update_rules.mock';
import { RulesManagementClient } from './rules_management_client';

// Failing with rule registry enabled
describe('RuleManagementClient.updateRule', () => {
  let rulesOptionsMock: ReturnType<typeof getUpdateRulesOptionsMock>;
  let rulesManagementClient: RulesManagementClient;

  beforeEach(() => {
    rulesOptionsMock = getUpdateRulesOptionsMock();
    rulesManagementClient = new RulesManagementClient(rulesOptionsMock.rulesClient);
  })

  it('should call rulesClient.disable if the rule was enabled and enabled is false', async () => {
    rulesOptionsMock.ruleUpdate.enabled = false;
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await rulesManagementClient.updateRule(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    rulesOptionsMock = {
      ...rulesOptionsMock,
      existingRule: {
        ...rulesOptionsMock.existingRule,
        enabled: false,
      },
    };
    rulesOptionsMock.ruleUpdate.enabled = true;

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await rulesManagementClient.updateRule(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('calls the rulesClient with params', async () => {
    const mlRulesOptionsMock = getUpdateMlRulesOptionsMock();
    mlRulesOptionsMock.ruleUpdate.enabled = true;

    (mlRulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getMlRuleParams())
    );

    (mlRulesOptionsMock.rulesClient as unknown as RulesClientMock).resolve.mockResolvedValue(
      resolveRuleMock(getMlRuleParams())
    );

    await rulesManagementClient.updateRule(mlRulesOptionsMock);

    expect(mlRulesOptionsMock.rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            type: 'machine_learning',
            severity: 'high',
          }),
        }),
      })
    );
  });
});
