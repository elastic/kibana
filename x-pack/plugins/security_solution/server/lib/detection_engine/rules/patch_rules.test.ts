/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';

import { patchRules } from './patch_rules';
import { getPatchRulesOptionsMock, getPatchMlRulesOptionsMock } from './patch_rules.mock';
import { PatchRulesOptions } from './types';
import { getRuleMock } from '../routes/__mocks__/request_responses';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

describe('patchRules', () => {
  it('should call rulesClient.disable if the rule was enabled and enabled is false', async () => {
    const rulesOptionsMock = getPatchRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: false,
    };
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );
    await patchRules(ruleOptions);
    expect(ruleOptions.rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ruleOptions.rule?.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    const rulesOptionsMock = getPatchRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );
    await patchRules(ruleOptions);
    expect(ruleOptions.rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ruleOptions.rule?.id,
      })
    );
  });

  it('calls the rulesClient with legacy ML params', async () => {
    const rulesOptionsMock = getPatchMlRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );
    await patchRules(ruleOptions);
    expect(ruleOptions.rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 55,
            machineLearningJobId: ['new_job_id'],
          }),
        }),
      })
    );
  });

  it('calls the rulesClient with new ML params', async () => {
    const rulesOptionsMock = getPatchMlRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      machineLearningJobId: ['new_job_1', 'new_job_2'],
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
    (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
      getRuleMock(getQueryRuleParams())
    );
    await patchRules(ruleOptions);
    expect(ruleOptions.rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 55,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
          }),
        }),
      })
    );
  });

  describe('regression tests', () => {
    it("updates the rule's actions if provided", async () => {
      const rulesOptionsMock = getPatchRulesOptionsMock();
      const ruleOptions: PatchRulesOptions = {
        ...rulesOptionsMock,
        actions: [
          {
            action_type_id: '.slack',
            id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
            },
            group: 'default',
          },
        ],
      };
      (rulesOptionsMock.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
        getRuleMock(getQueryRuleParams())
      );
      await patchRules(ruleOptions);
      expect(ruleOptions.rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [
              {
                actionTypeId: '.slack',
                id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
                },
                group: 'default',
              },
            ],
          }),
        })
      );
    });

    it('does not update actions if none are specified', async () => {
      const ruleOptions = getPatchRulesOptionsMock();
      delete ruleOptions.actions;
      if (ruleOptions.rule != null) {
        ruleOptions.rule.actions = [
          {
            actionTypeId: '.slack',
            id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
            params: {
              message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
            },
            group: 'default',
          },
        ];
      }
      (ruleOptions.rulesClient as unknown as RulesClientMock).update.mockResolvedValue(
        getRuleMock(getQueryRuleParams())
      );
      await patchRules(ruleOptions);
      expect(ruleOptions.rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [
              {
                actionTypeId: '.slack',
                id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
                params: {
                  message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
                },
                group: 'default',
              },
            ],
          }),
        })
      );
    });
  });
});
