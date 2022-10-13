/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { createRules } from './create_rules';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';
import {
  getCreateMachineLearningRulesSchemaMock,
  getCreateThreatMatchRulesSchemaMock,
} from '../../../../../../common/detection_engine/schemas/request/rule_schemas.mock';

describe('createRules', () => {
  it('calls the rulesClient with legacy ML params', async () => {
    const rulesClient = rulesClientMock.create();
    await createRules({ rulesClient, params: getCreateMachineLearningRulesSchemaMock() });
    expect(rulesClient.create).toHaveBeenCalledWith(
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

  it('calls the rulesClient with ML params', async () => {
    const rulesClient = rulesClientMock.create();
    await createRules({
      rulesClient,
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
          }),
        }),
      })
    );
  });

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const rulesClient = rulesClientMock.create();
    const params = getCreateThreatMatchRulesSchemaMock();
    delete params.threat_indicator_path;
    await createRules({ rulesClient, params });
    expect(rulesClient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
          }),
        }),
      })
    );
  });

  it('does not populate a threatIndicatorPath value for other rules if empty', async () => {
    const rulesClient = rulesClientMock.create();
    await createRules({ rulesClient, params: getCreateMachineLearningRulesSchemaMock() });
    expect(rulesClient.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          params: expect.objectContaining({
            threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
          }),
        }),
      })
    );
  });
});
