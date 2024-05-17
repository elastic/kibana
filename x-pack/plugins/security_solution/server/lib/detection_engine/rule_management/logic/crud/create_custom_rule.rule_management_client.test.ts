/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { createCustomRule } from './rules_management_client';

import { getCreateRulesSchemaMock } from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
// import { createRuleMock } from './__mocks__/rules_management_client';

import { _createRule } from './internal_methods.rules_management_client';
jest.mock('./internal_methods.rules_management_client', () => ({
  _createRule: jest.fn(),
}));

describe('RuleManagementClient.createPrebuiltRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  // let createRuleSpy: typeof createRuleMock;

  beforeEach(() => {
    jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  it('should call _createRule with the correct arguments and options', async () => {
    const ruleParams = getCreateRulesSchemaMock();

    await createCustomRule(rulesClient, { params: getCreateRulesSchemaMock() });

    expect(_createRule).toHaveBeenCalledTimes(1);
    expect(_createRule).toHaveBeenCalledWith(rulesClient, ruleParams, {
      immutable: false,
    });
    // expect(result).toEqual(mockedRule);
  });
});
