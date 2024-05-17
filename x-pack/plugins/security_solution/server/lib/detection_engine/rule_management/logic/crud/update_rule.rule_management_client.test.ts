/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';

import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getMlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';
import {
  getCreateMachineLearningRulesSchemaMock,
  getCreateRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { updateRule } from './rules_management_client';

describe('RuleManagementClient.updateRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('calls the rulesClient with expected params', async () => {
    const ruleUpdate = getCreateRulesSchemaMock();
    const existingRule = getRuleMock(getQueryRuleParams());
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    await updateRule(rulesClient, { ruleUpdate, existingRule });
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: ruleUpdate.name,
          params: expect.objectContaining({
            ruleId: ruleUpdate.rule_id,
            description: ruleUpdate.description,
          }),
        }),
      })
    );
  });

  it('returns rule enabled: true if the nexParams have enabled: true', async () => {
    const ruleUpdate = { ...getCreateRulesSchemaMock(), enabled: true };
    const existingRule = getRuleMock(getQueryRuleParams());
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    const rule = await updateRule(rulesClient, { ruleUpdate, existingRule });

    expect(rule.enabled).toBe(true);
  });

  it('calls the rulesClient with legacy ML params', async () => {
    const ruleUpdate = getCreateMachineLearningRulesSchemaMock();
    const existingRule = getRuleMock(getMlRuleParams());
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));
    await updateRule(rulesClient, { ruleUpdate, existingRule });
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['typical-ml-job-id'],
          }),
        }),
      })
    );
  });

  it('calls the rulesClient with new ML params', async () => {
    const ruleUpdate = {
      ...getCreateMachineLearningRulesSchemaMock(),
      machine_learning_job_id: ['new_job_1', 'new_job_2'],
    };
    const existingRule = getRuleMock(getMlRuleParams());
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));
    await updateRule(rulesClient, { ruleUpdate, existingRule });
    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
          }),
        }),
      })
    );
  });

  it('should call rulesClient.disable if the rule was enabled and enabled is false', async () => {
    const ruleUpdate = {
      ...getCreateRulesSchemaMock(),
      enabled: false,
    };
    const existingRule = {
      ...getRuleMock(getQueryRuleParams()),
      enabled: true,
    };
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await updateRule(rulesClient, { ruleUpdate, existingRule });
    expect(rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    const ruleUpdate = {
      ...getCreateRulesSchemaMock(),
      enabled: true,
    };
    const existingRule = {
      ...getRuleMock(getQueryRuleParams()),
      enabled: false,
    };
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
    await updateRule(rulesClient, { ruleUpdate, existingRule });
    expect(rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  describe('regression tests', () => {
    it("updates the rule's actions if provided", async () => {
      const ruleUpdate = {
        ...getCreateRulesSchemaMock(),
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
      const existingRule = getRuleMock(getQueryRuleParams());
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
      await updateRule(rulesClient, { ruleUpdate, existingRule });
      expect(rulesClient.update).toHaveBeenCalledWith(
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
                frequency: { summary: true, throttle: null, notifyWhen: 'onActiveAlert' },
              },
            ],
          }),
        })
      );
    });

    it('updates actions to empty if none are specified', async () => {
      const ruleUpdate = getCreateRulesSchemaMock();
      delete ruleUpdate.actions;
      const existingRule = getRuleMock(getQueryRuleParams());
      existingRule.actions = [
        {
          actionTypeId: '.slack',
          id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
          },
          group: 'default',
        },
      ];
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));
      await updateRule(rulesClient, { ruleUpdate, existingRule });
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actions: [],
          }),
        })
      );
    });
  });
});
