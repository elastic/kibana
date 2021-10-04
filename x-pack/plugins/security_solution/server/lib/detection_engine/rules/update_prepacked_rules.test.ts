/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';
import { updatePrepackagedRules } from './update_prepacked_rules';
import { patchRules } from './patch_rules';
import { getAddPrepackagedRulesSchemaDecodedMock } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';
import { ruleExecutionLogClientMock } from '../rule_execution_log/__mocks__/rule_execution_log_client';
jest.mock('./patch_rules');

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('updatePrepackagedRules - %s', (_, isRuleRegistryEnabled) => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let ruleStatusClient: ReturnType<typeof ruleExecutionLogClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    ruleStatusClient = ruleExecutionLogClientMock.create();
  });

  it('should omit actions and enabled when calling patchRules', async () => {
    const actions = [
      {
        group: 'group',
        id: 'id',
        action_type_id: 'action_type_id',
        params: {},
      },
    ];
    const outputIndex = 'outputIndex';
    const prepackagedRule = getAddPrepackagedRulesSchemaDecodedMock();
    rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));

    await updatePrepackagedRules(
      rulesClient,
      'default',
      ruleStatusClient,
      [{ ...prepackagedRule, actions }],
      outputIndex,
      isRuleRegistryEnabled
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        actions: undefined,
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: undefined,
      })
    );
  });
});
