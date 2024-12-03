/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientContextMock } from '../../../../rules_client/rules_client.mock';
import { RulesClient } from '../../../../rules_client';

describe('listRuleTypes', () => {
  const rulesClientContext = rulesClientContextMock.create();
  let rulesClient: RulesClient;

  beforeEach(async () => {
    jest.clearAllMocks();
    rulesClient = new RulesClient(rulesClientContext);

    rulesClientContext.ruleTypeRegistry.list = jest.fn().mockReturnValue(
      new Map([
        ['apm.anomaly', { name: 'Anomaly' }],
        ['.es-query', { name: 'ES rule type' }],
      ])
    );
    rulesClientContext.ruleTypeRegistry.has = jest
      .fn()
      .mockImplementation((ruleTypeId: string) => ruleTypeId === '.es-query');

    rulesClientContext.authorization.getAuthorizedRuleTypes = jest.fn().mockResolvedValue(
      new Map([
        ['.es-query', { authorizedConsumers: { all: true, read: true } }],
        ['.not-exist', { authorizedConsumers: { all: true, read: true } }],
      ])
    );
  });

  it('authorizes correctly', async () => {
    await rulesClient.listRuleTypes();

    expect(rulesClientContext.authorization.getAuthorizedRuleTypes).toHaveBeenCalledWith({
      authorizationEntity: 'rule',
      operations: ['get', 'create'],
      ruleTypeIds: ['apm.anomaly', '.es-query'],
    });
  });

  it('returns the authorized rule types correctly and does not return non authorized or non existing rule types', async () => {
    const res = await rulesClient.listRuleTypes();

    expect(res).toEqual([{ name: 'ES rule type', authorizedConsumers: { all: true, read: true } }]);
  });
});
