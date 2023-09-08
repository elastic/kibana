/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleActionTypes } from '@kbn/alerting-plugin/common';
import type { RulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { NOTIFICATION_DEFAULT_FREQUENCY } from '../../../../../../common/constants';
import { getRuleMock, resolveRuleMock } from '../../../routes/__mocks__/request_responses';
import { getMlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';
import { updateRules } from './update_rules';
import { getUpdateRulesOptionsMock, getUpdateMlRulesOptionsMock } from './update_rules.mock';

// Failing with rule registry enabled
describe('updateRules', () => {
  it('should call rulesClient.disable if the rule was enabled and enabled is false', async () => {
    const rulesOptionsMock = getUpdateRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = false;
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    const baseRulesOptionsMock = getUpdateRulesOptionsMock();
    const rulesOptionsMock = {
      ...baseRulesOptionsMock,
      existingRule: {
        ...baseRulesOptionsMock.existingRule,
        enabled: false,
      },
    };
    rulesOptionsMock.ruleUpdate.enabled = true;

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await updateRules(rulesOptionsMock);

    expect(rulesOptionsMock.rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: rulesOptionsMock.ruleUpdate.id,
      })
    );
  });

  it('calls the rulesClient with params', async () => {
    const rulesOptionsMock = getUpdateMlRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = true;

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getMlRuleParams())
    );

    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).resolve.mockResolvedValue(
      resolveRuleMock(getMlRuleParams())
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

  it('should add frequency to default actions', async () => {
    const defaultAction = {
      id: 'id',
      action_type_id: 'action_type_id',
      params: {},
      group: 'group',
    };

    const rulesOptionsMock = getUpdateRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = false;
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await updateRules({
      ...rulesOptionsMock,
      ruleUpdate: { ...rulesOptionsMock.ruleUpdate, actions: [defaultAction] },
    });

    const data = rulesOptionsMock.rulesClient.update.mock.calls[0][0].data;

    expect(data.actions).toEqual([
      {
        id: 'id',
        actionTypeId: 'action_type_id',
        params: {},
        group: 'group',
        frequency: NOTIFICATION_DEFAULT_FREQUENCY,
      },
    ]);
  });

  it('should not add frequency to system actions', async () => {
    const systemAction = {
      id: 'id',
      action_type_id: 'action_type_id',
      params: {},
      uuid: 'uuid',
      type: RuleActionTypes.SYSTEM,
    };

    const rulesOptionsMock = getUpdateRulesOptionsMock();
    rulesOptionsMock.ruleUpdate.enabled = false;
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );

    await updateRules({
      ...rulesOptionsMock,
      ruleUpdate: { ...rulesOptionsMock.ruleUpdate, actions: [systemAction] },
    });

    const data = rulesOptionsMock.rulesClient.update.mock.calls[0][0].data;

    expect(data.actions).toEqual([
      {
        id: 'id',
        actionTypeId: 'action_type_id',
        params: {},
        uuid: 'uuid',
        type: RuleActionTypes.SYSTEM,
      },
    ]);
  });
});
