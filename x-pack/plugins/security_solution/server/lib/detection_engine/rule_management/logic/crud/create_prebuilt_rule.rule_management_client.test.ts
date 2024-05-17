/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { createPrebuiltRule } from './rules_management_client';

import { getPrebuiltRuleAsset } from '../../../rule_schema/mocks';

import { _createRule } from './internal_methods.rules_management_client';

jest.mock('./internal_methods.rules_management_client');

describe('RuleManagementClient.createPrebuiltRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  it('should call _createRule with the correct arguments and options', async () => {
    const ruleAsset = getPrebuiltRuleAsset();

    await createPrebuiltRule(rulesClient, { ruleAsset });

    expect(_createRule).toHaveBeenCalledTimes(1);
    expect(_createRule).toHaveBeenCalledWith(rulesClient, ruleAsset, {
      immutable: true,
      defaultEnabled: false,
    });
  });
});
