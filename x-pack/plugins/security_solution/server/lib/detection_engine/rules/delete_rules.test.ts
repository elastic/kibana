/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { deleteRules } from './delete_rules';
import { SavedObjectsFindResult } from '../../../../../../../src/core/server';
import { DeleteRuleOptions, IRuleStatusSOAttributes } from './types';
import { ruleExecutionLogClientMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';

describe('deleteRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleStatusClient: ReturnType<typeof ruleExecutionLogClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleStatusClient = ruleExecutionLogClientMock.create();
  });

  it('should delete the rule along with its actions, and statuses', async () => {
    const ruleStatus: SavedObjectsFindResult<IRuleStatusSOAttributes> = {
      id: 'statusId',
      type: '',
      references: [],
      attributes: {
        alertId: 'alertId',
        statusDate: '',
        lastFailureAt: null,
        lastFailureMessage: null,
        lastSuccessAt: null,
        lastSuccessMessage: null,
        status: null,
        lastLookBackDate: null,
        gap: null,
        bulkCreateTimeDurations: null,
        searchAfterTimeDurations: null,
      },
      score: 0,
    };

    const rule: DeleteRuleOptions = {
      rulesClient,
      ruleStatusClient,
      id: 'ruleId',
      ruleStatuses: [ruleStatus],
    };

    await deleteRules(rule);

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: rule.id });
    expect(ruleStatusClient.delete).toHaveBeenCalledWith(ruleStatus.id);
  });
});
