/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertMock } from '../routes/__mocks__/request_responses';
import { updateRules } from './update_rules';
import { getUpdateRulesOptionsMock, getUpdateMlRulesOptionsMock } from './update_rules.mock';
import { RulesClientMock } from '../../../../../alerting/server/rules_client.mock';
import { getMlRuleParams, getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { createRuleDataClientMock } from '../../../../../rule_registry/server/rule_data_client/rule_data_client.mock';

describe('updateRules', () => {
  const ruleDataClientMock = createRuleDataClientMock();

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])(
    'should call rulesClient.disable if the rule was enabled and enabled is false - %s',
    async (_, ruleDataClient) => {
      const rulesOptionsMock = getUpdateRulesOptionsMock(ruleDataClient != null);
      rulesOptionsMock.ruleUpdate.enabled = false;
      ((rulesOptionsMock.rulesClient as unknown) as RulesClientMock).get.mockResolvedValue(
        getAlertMock(getQueryRuleParams(ruleDataClient != null))
      );

      await updateRules(rulesOptionsMock);

      expect(rulesOptionsMock.rulesClient.disable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: rulesOptionsMock.ruleUpdate.id,
        })
      );
    }
  );

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])(
    'should call rulesClient.enable if the rule was disabled and enabled is true - %s',
    async (_, ruleDataClient) => {
      const rulesOptionsMock = getUpdateRulesOptionsMock(ruleDataClient != null);
      rulesOptionsMock.ruleUpdate.enabled = true;

      ((rulesOptionsMock.rulesClient as unknown) as RulesClientMock).get.mockResolvedValue({
        ...getAlertMock(getQueryRuleParams(ruleDataClient != null)),
        enabled: false,
      });

      await updateRules(rulesOptionsMock);

      expect(rulesOptionsMock.rulesClient.enable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: rulesOptionsMock.ruleUpdate.id,
        })
      );
    }
  );

  test.each([
    ['Legacy', undefined],
    ['RAC', ruleDataClientMock],
  ])('calls the rulesClient with params - %s', async (_, ruleDataClient) => {
    const rulesOptionsMock = getUpdateMlRulesOptionsMock(ruleDataClient != null);
    rulesOptionsMock.ruleUpdate.enabled = true;

    ((rulesOptionsMock.rulesClient as unknown) as RulesClientMock).get.mockResolvedValue(
      getAlertMock(getMlRuleParams(ruleDataClient != null))
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
