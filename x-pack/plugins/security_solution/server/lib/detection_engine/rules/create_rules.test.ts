/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createRules } from './create_rules';
import {
  getCreateMlRulesOptionsMock,
  getCreateThreatMatchRulesOptionsMock,
} from './create_rules.mock';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../common/constants';

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('createRules - %s', (_, isRuleRegistryEnabled) => {
  it('calls the rulesClient with legacy ML params', async () => {
    const ruleOptions = getCreateMlRulesOptionsMock(isRuleRegistryEnabled);
    await createRules(ruleOptions);
    expect(ruleOptions.rulesClient.create).toHaveBeenCalledWith(
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

  it('calls the rulesClient with ML params', async () => {
    const ruleOptions = {
      ...getCreateMlRulesOptionsMock(isRuleRegistryEnabled),
      machineLearningJobId: ['new_job_1', 'new_job_2'],
    };
    await createRules(ruleOptions);
    expect(ruleOptions.rulesClient.create).toHaveBeenCalledWith(
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

  it('populates a threatIndicatorPath value for threat_match rule if empty', async () => {
    const ruleOptions = getCreateThreatMatchRulesOptionsMock(isRuleRegistryEnabled);
    delete ruleOptions.threatIndicatorPath;
    await createRules(ruleOptions);
    expect(ruleOptions.rulesClient.create).toHaveBeenCalledWith(
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
    const ruleOptions = getCreateMlRulesOptionsMock(isRuleRegistryEnabled);
    delete ruleOptions.threatIndicatorPath;
    await createRules(ruleOptions);
    expect(ruleOptions.rulesClient.create).not.toHaveBeenCalledWith(
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
