/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { ruleExecutionLogMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';
import { deleteRules } from './delete_rules';
import { DeleteRuleOptions } from './types';

describe('deleteRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleExecutionLogClient: ReturnType<typeof ruleExecutionLogMock.client.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleExecutionLogClient = ruleExecutionLogMock.client.create();
  });

  it('should delete the rule along with its actions, and statuses', async () => {
    const options: DeleteRuleOptions = {
      ruleId: 'ruleId',
      rulesClient,
      ruleExecutionLogClient,
    };

    await deleteRules(options);

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: options.ruleId });
    expect(ruleExecutionLogClient.clearExecutionSummary).toHaveBeenCalledWith(options.ruleId);
  });
});
