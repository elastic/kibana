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
import { readRules } from './read_rules';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';
import { createDetectionRulesClient } from './detection_rules_client';
import type { IDetectionRulesClient } from './detection_rules_client_interface';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

jest.mock('./read_rules');

describe('DetectionRulesClient.patchRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let detectionRulesClient: IDetectionRulesClient;

  const mlAuthz = (buildMlAuthz as jest.Mock)();

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    detectionRulesClient = createDetectionRulesClient(rulesClient, mlAuthz);
  });

  it('calls the rulesClient with expected params', async () => {
    const nextParams = getCreateRulesSchemaMock();
    const existingRule = getRuleMock(getQueryRuleParams());
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.patchRule({ nextParams });

    expect(rulesClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: nextParams.name,
          params: expect.objectContaining({
            ruleId: nextParams.rule_id,
            description: nextParams.description,
          }),
        }),
      })
    );
  });

  it('returns rule enabled: true if the nexParams have enabled: true', async () => {
    const nextParams = { ...getCreateRulesSchemaMock(), enabled: true };
    const existingRule = getRuleMock(getQueryRuleParams());
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    const rule = await detectionRulesClient.patchRule({ nextParams });

    expect(rule.enabled).toBe(true);
  });

  it('calls the rulesClient with legacy ML params', async () => {
    const nextParams = getCreateMachineLearningRulesSchemaMock();
    const existingRule = getRuleMock(getMlRuleParams());
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));

    await detectionRulesClient.patchRule({ nextParams });
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
    const nextParams = {
      ...getCreateMachineLearningRulesSchemaMock(),
      machine_learning_job_id: ['new_job_1', 'new_job_2'],
    };
    const existingRule = getRuleMock(getMlRuleParams());
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getMlRuleParams()));

    await detectionRulesClient.patchRule({ nextParams });

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
    const nextParams = {
      ...getCreateRulesSchemaMock(),
      enabled: false,
    };
    const existingRule = {
      ...getRuleMock(getQueryRuleParams()),
      enabled: true,
    };
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.patchRule({ nextParams });

    expect(rulesClient.disable).toHaveBeenCalledWith(
      expect.objectContaining({
        id: existingRule.id,
      })
    );
  });

  it('should call rulesClient.enable if the rule was disabled and enabled is true', async () => {
    const nextParams = {
      ...getCreateRulesSchemaMock(),
      enabled: true,
    };
    const existingRule = {
      ...getRuleMock(getQueryRuleParams()),
      enabled: false,
    };
    (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
    rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

    await detectionRulesClient.patchRule({ nextParams });

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

    const nextParams = {
      ...getCreateRulesSchemaMock(),
      enabled: true,
    };

    await expect(detectionRulesClient.patchRule({ nextParams })).rejects.toThrow(
      'mocked MLAuth error'
    );

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  describe('regression tests', () => {
    it("updates the rule's actions if provided", async () => {
      const nextParams = {
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
      (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.patchRule({ nextParams });

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

    it('does not update actions if none are specified', async () => {
      const nextParams = getCreateRulesSchemaMock();
      delete nextParams.actions;
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
      (readRules as jest.Mock).mockResolvedValueOnce(existingRule);
      rulesClient.update.mockResolvedValue(getRuleMock(getQueryRuleParams()));

      await detectionRulesClient.patchRule({ nextParams });

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
  });
});
