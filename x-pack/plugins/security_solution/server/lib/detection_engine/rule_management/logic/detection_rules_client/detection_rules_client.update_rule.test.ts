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
  getRulesMlSchemaMock,
  getRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { getRuleByRuleId } from './methods/get_rule_by_rule_id';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

jest.mock('./methods/get_rule_by_rule_id');

describe('DetectionRulesClient.updateRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    const savedObjectsClient = savedObjectsClientMock.create();
    detectionRulesClient = createDetectionRulesClient({ rulesClient, mlAuthz, savedObjectsClient });
  });

  it('calls the rulesClient with expected params', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const ruleUpdate = getCreateRulesSchemaMock('query-rule-id');
    ruleUpdate.name = 'new name';
    ruleUpdate.description = 'new description';

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.updateRule({ ruleUpdate });

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

  it('calls the rulesClient with new ML params', async () => {
    // Mock the existing rule
    const existingRule = getRulesMlSchemaMock();
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const ruleUpdate = getCreateMachineLearningRulesSchemaMock();
    ruleUpdate.anomaly_threshold = 42;
    ruleUpdate.machine_learning_job_id = ['new-job-id'];

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));

    await detectionRulesClient.updateRule({ ruleUpdate });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: ruleUpdate.anomaly_threshold,
            machineLearningJobId: ruleUpdate.machine_learning_job_id,
          }),
        }),
      })
    );
  });

  it('disables rule if the rule was enabled and enabled is false', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    existingRule.enabled = true;
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const ruleUpdate = { ...getCreateRulesSchemaMock(), enabled: false };

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.updateRule({ ruleUpdate });

    expect(rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('enables rule if the rule was disabled and enabled is true', async () => {
    // Mock the existing rule
    const existingRule = getRulesSchemaMock();
    existingRule.enabled = false;
    (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

    // Mock the rule update
    const ruleUpdate = { ...getCreateRulesSchemaMock(), enabled: true };

    // Mock the rule returned after update; not used for this test directly but
    // needed so that the patchRule method does not throw
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.updateRule({ ruleUpdate });

    expect(rulesClient.enable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    const ruleUpdate = {
      ...getCreateRulesSchemaMock(),
      enabled: true,
    };

    await expect(detectionRulesClient.updateRule({ ruleUpdate })).rejects.toThrow(
      'mocked MLAuth error'
    );

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  describe('actions', () => {
    it("updates the rule's actions if provided", async () => {
      // Mock the existing rule
      const existingRule = getRulesSchemaMock();
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);

      // Mock the rule update
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

      // Mock the rule returned after update; not used for this test directly but
      // needed so that the patchRule method does not throw
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.updateRule({ ruleUpdate });

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
      // Mock the existing rule
      const existingRule = getRulesSchemaMock();
      (getRuleByRuleId as jest.Mock).mockResolvedValueOnce(existingRule);
      existingRule.actions = [
        {
          action_type_id: '.slack',
          id: '2933e581-d81c-4fe3-88fe-c57c6b8a5bfd',
          params: {
            message: 'Rule {{context.rule.name}} generated {{state.signals_count}} signals',
          },
          group: 'default',
        },
      ];

      // Mock the rule update
      const ruleUpdate = getCreateRulesSchemaMock();
      delete ruleUpdate.actions;

      // Mock the rule returned after update; not used for this test directly but
      // needed so that the patchRule method does not throw
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.updateRule({ ruleUpdate });

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
