/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { createPrebuiltRule } from './detection_rules_client';

import {
  getCreateRulesSchemaMock,
  getCreateMachineLearningRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import { buildMlAuthz } from '../../../../machine_learning/authz';
import { throwAuthzError } from '../../../../machine_learning/validation';

jest.mock('../../../../machine_learning/authz');
jest.mock('../../../../machine_learning/validation');

describe('DetectionRulesClient.createPrebuiltRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  const mlAuthz = (buildMlAuthz as jest.Mock)();

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  it('creates a rule with the correct parameters and options', async () => {
    const ruleAsset = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };

    await createPrebuiltRule(rulesClient, { ruleAsset }, mlAuthz);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          name: ruleAsset.name,
          params: expect.objectContaining({
            ruleId: ruleAsset.rule_id,
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    const ruleAsset = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(createPrebuiltRule(rulesClient, { ruleAsset }, mlAuthz)).rejects.toThrow(
      'mocked MLAuth error'
    );

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  it('calls the rulesClient with legacy ML params', async () => {
    const ruleAsset = {
      ...getCreateMachineLearningRulesSchemaMock(),
      version: 1,
      rule_id: 'rule-id',
    };
    await createPrebuiltRule(
      rulesClient,
      {
        ruleAsset,
      },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            anomalyThreshold: ruleAsset.anomaly_threshold,
            machineLearningJobId: [ruleAsset.machine_learning_job_id],
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('calls the rulesClient with ML params', async () => {
    const ruleAsset = {
      ...getCreateMachineLearningRulesSchemaMock(),
      machine_learning_job_id: ['new_job_1', 'new_job_2'],
      version: 1,
      rule_id: 'rule-id',
    };
    await createPrebuiltRule(
      rulesClient,
      {
        ruleAsset,
      },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const ruleAsset = { ...getCreateThreatMatchRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    delete ruleAsset.threat_indicator_path;

    await createPrebuiltRule(
      rulesClient,
      {
        ruleAsset,
      },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('does not populate a threatIndicatorPath value for other rules if empty', async () => {
    const ruleAsset = { ...getCreateRulesSchemaMock(), version: 1, rule_id: 'rule-id' };
    await createPrebuiltRule(rulesClient, { ruleAsset }, mlAuthz);
    expect(rulesClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: false,
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: true,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });
});
