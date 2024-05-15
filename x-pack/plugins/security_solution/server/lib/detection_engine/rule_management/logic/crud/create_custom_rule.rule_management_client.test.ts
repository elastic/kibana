/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import {
  getCreateMachineLearningRulesSchemaMock,
  getCreateRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import { RulesManagementClient } from './rules_management_client';

describe('RuleManagementClient.createCustomRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let rulesManagementClient: RulesManagementClient;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    rulesManagementClient = new RulesManagementClient(rulesClient);
  });

  it('should create a custom rule with the correct parameters', async () => {
    const params = getCreateRulesSchemaMock();

    await rulesManagementClient.createCustomRule({ params });

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

  it('calls the rulesClient with legacy ML params', async () => {
    await rulesManagementClient.createCustomRule({
      params: getCreateMachineLearningRulesSchemaMock(),
    });
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
    await rulesManagementClient.createCustomRule({
      params: {
        ...getCreateMachineLearningRulesSchemaMock(),
        machine_learning_job_id: ['new_job_1', 'new_job_2'],
      },
    });
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
    await rulesManagementClient.createCustomRule({ params });
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
    await rulesManagementClient.createCustomRule({
      params: getCreateMachineLearningRulesSchemaMock(),
    });
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
