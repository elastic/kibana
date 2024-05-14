/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { getRulesManagementClient } from './rules_management_client';

describe('RuleManagementClient.deleteRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  const rulesManagementClient = getRulesManagementClient();

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('should delete the rule along with its actions, and statuses', async () => {
    const ruleId = 'ruleId';
    await rulesManagementClient.deleteRule({
      rulesClient,
      ruleId,
    });

    expect(rulesClient.delete).toHaveBeenCalledWith({ id: ruleId });
  });
});
