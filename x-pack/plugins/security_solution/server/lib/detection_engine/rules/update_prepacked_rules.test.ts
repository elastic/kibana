/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '../../../../../alerting/server/mocks';
import { savedObjectsClientMock } from '../../../../../../../src/core/server/mocks';
import { getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';
import { updatePrepackagedRules } from './update_prepacked_rules';
import { patchRules } from './patch_rules';
import { getAddPrepackagedRulesSchemaDecodedMock } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';

jest.mock('./patch_rules');

describe.each([
  ['Legacy', false],
  ['RAC', true],
])('updatePrepackagedRules - %s', (_, isRuleRegistryEnabled) => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
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
      savedObjectsClient,
      'default',
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

  it('should update threat match rules', async () => {
    const updatedThreatParams = {
      threat_index: ['test-index'],
      threat_indicator_path: 'test.path',
      threat_query: 'threat:*',
    };
    const prepackagedRule = getAddPrepackagedRulesSchemaDecodedMock();
    rulesClient.find.mockResolvedValue(getFindResultWithSingleHit(isRuleRegistryEnabled));

    await updatePrepackagedRules(
      rulesClient,
      savedObjectsClient,
      'default',
      [{ ...prepackagedRule, ...updatedThreatParams }],
      'output-index',
      isRuleRegistryEnabled
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        threatIndicatorPath: 'test.path',
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        threatIndex: ['test-index'],
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        threatQuery: 'threat:*',
      })
    );
  });
});
