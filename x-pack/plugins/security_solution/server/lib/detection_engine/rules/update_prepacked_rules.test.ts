/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getFindResultWithSingleHit } from '../routes/__mocks__/request_responses';
import { updatePrepackagedRules } from './update_prepacked_rules';
import { patchRules } from './patch_rules';
import { getAddPrepackagedRulesSchemaDecodedMock } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';
import { ruleExecutionLogMock } from '../rule_execution_log/__mocks__';

jest.mock('./patch_rules');

describe('updatePrepackagedRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let ruleExecutionLog: ReturnType<typeof ruleExecutionLogMock.forRoutes.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
    ruleExecutionLog = ruleExecutionLogMock.forRoutes.create();
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
    rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    await updatePrepackagedRules(
      rulesClient,
      savedObjectsClient,
      [{ ...prepackagedRule, actions }],
      outputIndex,
      ruleExecutionLog
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
    rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    await updatePrepackagedRules(
      rulesClient,
      savedObjectsClient,
      [{ ...prepackagedRule, ...updatedThreatParams }],
      'output-index',
      ruleExecutionLog
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
