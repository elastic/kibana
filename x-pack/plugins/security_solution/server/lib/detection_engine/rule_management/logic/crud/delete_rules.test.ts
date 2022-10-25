/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { ruleExecutionLogMock } from '../../../rule_monitoring/mocks';
import type { DeleteRuleOptions } from './delete_rules';
import { deleteRules } from './delete_rules';

describe('deleteRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleExecutionLog: ReturnType<typeof ruleExecutionLogMock.forRoutes.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleExecutionLog = ruleExecutionLogMock.forRoutes.create();
  });

  it('should delete the rule along with its actions, and statuses', async () => {
    const options: DeleteRuleOptions = {
      ruleId: 'ruleId',
      rulesClient,
      ruleExecutionLog,
    };

    await deleteRules(options);

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: options.ruleId });
    expect(ruleExecutionLog.clearExecutionSummary).toHaveBeenCalledWith(options.ruleId);
  });
});
