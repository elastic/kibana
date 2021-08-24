/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { patchRules } from './patch_rules';
import { getPatchRulesOptionsMock, getPatchMlRulesOptionsMock } from './patch_rules.mock';
import { PatchRulesOptions } from './types';

describe('patchRules', () => {
  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'should call rulesClient.disable if the rule was enabled and enabled is false - %s',
    async (_, isRuleRegistryEnabled) => {
      const rulesOptionsMock = getPatchRulesOptionsMock(isRuleRegistryEnabled) as PatchRulesOptions;
      const ruleOptions: PatchRulesOptions = {
        ...rulesOptionsMock,
        enabled: false,
      };
      await patchRules(ruleOptions);
      expect(ruleOptions.rulesClient.disable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ruleOptions.rule?.id,
        })
      );
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])(
    'should call rulesClient.enable if the rule was disabled and enabled is true - %s',
    async (_, isRuleRegistryEnabled) => {
      const rulesOptionsMock = getPatchRulesOptionsMock(isRuleRegistryEnabled) as PatchRulesOptions;
      const ruleOptions: PatchRulesOptions = {
        ...rulesOptionsMock,
        enabled: true,
      };
      if (ruleOptions.rule != null) {
        ruleOptions.rule.enabled = false;
      }
      await patchRules(ruleOptions);
      expect(ruleOptions.rulesClient.enable).toHaveBeenCalledWith(
        expect.objectContaining({
          id: ruleOptions.rule?.id,
        })
      );
    }
  );

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('calls the rulesClient with legacy ML params - %s', async (_, isRuleRegistryEnabled) => {
    const rulesOptionsMock = getPatchMlRulesOptionsMock(isRuleRegistryEnabled);
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
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

  test.each([
    ['Legacy', false],
    ['RAC', true],
  ])('calls the rulesClient with new ML params - %s', async (_, isRuleRegistryEnabled) => {
    const rulesOptionsMock = getPatchMlRulesOptionsMock(isRuleRegistryEnabled);
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      machineLearningJobId: ['new_job_1', 'new_job_2'],
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
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
    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])("updates the rule's actions if provided - %s", async (_, isRuleRegistryEnabled) => {
      const rulesOptionsMock = getPatchRulesOptionsMock(isRuleRegistryEnabled) as PatchRulesOptions;
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

    test.each([
      ['Legacy', false],
      ['RAC', true],
    ])('does not update actions if none are specified - %s', async (_, isRuleRegistryEnabled) => {
      const ruleOptions = getPatchRulesOptionsMock(isRuleRegistryEnabled) as PatchRulesOptions;
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
