/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createRules } from './create_rules';
import { getCreateMlRulesOptionsMock } from './create_rules.mock';

describe('createRules', () => {
  it('calls the alertsClient with ML params', async () => {
    const ruleOptions = getCreateMlRulesOptionsMock();
    await createRules(ruleOptions);
    expect(ruleOptions.alertsClient.create).toHaveBeenCalledWith(
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
});
