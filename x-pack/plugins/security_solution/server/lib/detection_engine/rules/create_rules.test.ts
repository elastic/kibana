/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRules } from './create_rules';
import { getCreateMlRulesOptionsMock } from './create_rules.mock';

describe('createRules', () => {
  it('calls the alertsClient with legacy ML params', async () => {
    const ruleOptions = getCreateMlRulesOptionsMock();
    await createRules(ruleOptions);
    expect(ruleOptions.alertsClient.create).toHaveBeenCalledWith(
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

  it('calls the alertsClient with ML params', async () => {
    const ruleOptions = {
      ...getCreateMlRulesOptionsMock(),
      machineLearningJobId: ['new_job_1', 'new_job_2'],
    };
    await createRules(ruleOptions);
    expect(ruleOptions.alertsClient.create).toHaveBeenCalledWith(
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
});
