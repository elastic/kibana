/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { createCustomRule } from './rules_management_client';

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

describe('RuleManagementClient.createCustomRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  const mlAuthz = (buildMlAuthz as jest.Mock)();

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  it('should create a rule with the correct parameters and options', async () => {
    const params = getCreateRulesSchemaMock();

    await createCustomRule(rulesClient, { params }, mlAuthz);

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          enabled: true,
          params: expect.objectContaining({
            description: params.description,
            immutable: false,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('throws if mlAuth fails', async () => {
    (throwAuthzError as jest.Mock).mockImplementationOnce(() => {
      throw new Error('mocked MLAuth error');
    });

    await expect(
      createCustomRule(rulesClient, { params: getCreateMachineLearningRulesSchemaMock() }, mlAuthz)
    ).rejects.toThrow('mocked MLAuth error');

    expect(rulesClient.create).not.toHaveBeenCalled();
  });

  it('calls the rulesClient with legacy ML params', async () => {
    await createCustomRule(
      rulesClient,
      { params: getCreateMachineLearningRulesSchemaMock() },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['typical-ml-job-id'],
            immutable: false,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('calls the rulesClient with ML params', async () => {
    await createCustomRule(
      rulesClient,
      {
        params: {
          ...getCreateMachineLearningRulesSchemaMock(),
          machine_learning_job_id: ['new_job_1', 'new_job_2'],
        },
      },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            anomalyThreshold: 58,
            machineLearningJobId: ['new_job_1', 'new_job_2'],
            immutable: false,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const params = getCreateThreatMatchRulesSchemaMock();
    delete params.threat_indicator_path;

    await createCustomRule(
      rulesClient,
      {
        params,
      },
      mlAuthz
    );

    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: false,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });

  it('does not populate a threatIndicatorPath value for other rules if empty', async () => {
    await createCustomRule(rulesClient, { params: getCreateRulesSchemaMock() }, mlAuthz);
    expect(rulesClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
            immutable: false,
          }),
        }),
        options: {},
        allowMissingConnectorSecrets: undefined,
      })
    );
  });
});
