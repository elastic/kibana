/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { patchRules } from './patch_rules';
import { getPatchRulesOptionsMock, getPatchMlRulesOptionsMock } from './patch_rules.mock';
import { PatchRulesOptions } from './types';

describe('patchRules', () => {
  it('should call alertsClient.disable if the rule was enabled and enabled is false', async () => {
    const rulesOptionsMock = getPatchRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: false,
    };
    await patchRules(ruleOptions);
    expect(ruleOptions.alertsClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ruleOptions.rule?.id,
      })
    );
  });

  it('should call alertsClient.enable if the rule was disabled and enabled is true', async () => {
    const rulesOptionsMock = getPatchRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
    await patchRules(ruleOptions);
    expect(ruleOptions.alertsClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ruleOptions.rule?.id,
      })
    );
  });

  it('calls the alertsClient with ML params', async () => {
    const rulesOptionsMock = getPatchMlRulesOptionsMock();
    const ruleOptions: PatchRulesOptions = {
      ...rulesOptionsMock,
      enabled: true,
    };
    if (ruleOptions.rule != null) {
      ruleOptions.rule.enabled = false;
    }
    await patchRules(ruleOptions);
    expect(ruleOptions.alertsClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 55,
            machineLearningJobId: 'new_job_id',
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
      await patchRules(ruleOptions);
      expect(ruleOptions.alertsClient.update).toHaveBeenCalledWith(
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

      await patchRules(ruleOptions);
      expect(ruleOptions.alertsClient.update).toHaveBeenCalledWith(
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
