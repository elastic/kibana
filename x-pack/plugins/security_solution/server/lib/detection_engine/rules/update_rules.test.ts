/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertMock, resolveAlertMock } from '../routes/__mocks__/request_responses';
import { updateRules } from './update_rules';
import { getUpdateRulesOptionsMock, getUpdateMlRulesOptionsMock } from './update_rules.mock';
import { RulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { getMlRuleParams, getQueryRuleParams } from '../schemas/rule_schemas.mock';

// Failing with rule registry enabled
describe('updateRules', () => {
  it('should call rulesClient.disable if the rule was enabled and enabled is false', async () => {
    const rulesOptionsMock = getUpdateRulesOptionsMock(true);
    rulesOptionsMock.ruleUpdate.enabled = false;
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getAlertMock(true, getQueryRuleParams())
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    const baseRulesOptionsMock = getUpdateRulesOptionsMock(true);
    const rulesOptionsMock = {
      ...baseRulesOptionsMock,
      existingRule: {
        ...baseRulesOptionsMock.existingRule,
        enabled: false,
      },
    };
    rulesOptionsMock.ruleUpdate.enabled = true;

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getAlertMock(true, getQueryRuleParams())
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('calls the rulesClient with params', async () => {
    const rulesOptionsMock = getUpdateMlRulesOptionsMock(true);
    rulesOptionsMock.ruleUpdate.enabled = true;

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getAlertMock(true, getMlRuleParams())
    );

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).resolve.mockResolvedValue(
      resolveAlertMock(true, getMlRuleParams())
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.update).toHaveBeenCalledWith(
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
