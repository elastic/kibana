/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { ruleExecutionLogClientMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';
import { deleteRules } from './delete_rules';
import { DeleteRuleOptions } from './types';

describe('deleteRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleStatusClient: ReturnType<typeof ruleExecutionLogClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleStatusClient = ruleExecutionLogClientMock.create();
  });

  it('should delete the rule along with its actions, and statuses', async () => {
    const options: DeleteRuleOptions = {
      ruleId: 'ruleId',
      rulesClient,
      ruleStatusClient,
    };

    await deleteRules(options);

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: options.ruleId });
    expect(ruleStatusClient.deleteCurrentStatus).toHaveBeenCalledWith(options.ruleId);
  });
});
