/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { getRuleMock, getFindResultWithSingleHit } from '../../routes/__mocks__/request_responses';
import { updatePrebuiltRules } from './update_prebuilt_rules';
import { patchRules } from '../../rule_management/logic/crud/patch_rules';
import {
  getPrebuiltRuleMock,
  getPrebuiltThreatMatchRuleMock,
} from '../../../../../common/detection_engine/prebuilt_rules/mocks';
import { ruleExecutionLogMock } from '../../rule_monitoring/mocks';
import { legacyMigrate } from '../../rule_management';
import { getQueryRuleParams, getThreatRuleParams } from '../../rule_schema/mocks';

jest.mock('../../rule_management/logic/crud/patch_rules');

jest.mock('../../rule_management/logic/rule_actions/legacy_action_migration', () => {
  const actual = jest.requireActual(
    '../../rule_management/logic/rule_actions/legacy_action_migration'
  );
  return {
    ...actual,
    legacyMigrate: jest.fn(),
  };
});

describe('updatePrebuiltRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let ruleExecutionLog: ReturnType<typeof ruleExecutionLogMock.forRoutes.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
    savedObjectsClient = savedObjectsClientMock.create();
    ruleExecutionLog = ruleExecutionLogMock.forRoutes.create();

    (legacyMigrate as jest.Mock).mockResolvedValue(getRuleMock(getQueryRuleParams()));
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
    const prepackagedRule = getPrebuiltRuleMock();
    rulesClient.find.mockResolvedValue(getFindResultWithSingleHit());

    await updatePrebuiltRules(
      rulesClient,
      savedObjectsClient,
      [{ ...prepackagedRule, actions }],
      ruleExecutionLog
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        nextParams: expect.objectContaining({
          actions: undefined,
        }),
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        nextParams: expect.objectContaining({
          enabled: undefined,
        }),
      })
    );
  });

  it('should update threat match rules', async () => {
    const updatedThreatParams = {
      threat_index: ['test-index'],
      threat_indicator_path: 'test.path',
      threat_query: 'threat:*',
    };
    const prepackagedRule = getPrebuiltThreatMatchRuleMock();
    rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      data: [getRuleMock(getThreatRuleParams())],
    });
    (legacyMigrate as jest.Mock).mockResolvedValue(getRuleMock(getThreatRuleParams()));

    await updatePrebuiltRules(
      rulesClient,
      savedObjectsClient,
      [{ ...prepackagedRule, ...updatedThreatParams }],
      ruleExecutionLog
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        nextParams: expect.objectContaining({
          threat_indicator_path: 'test.path',
        }),
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        nextParams: expect.objectContaining({
          threat_index: ['test-index'],
        }),
      })
    );

    expect(patchRules).toHaveBeenCalledWith(
      expect.objectContaining({
        nextParams: expect.objectContaining({
          threat_query: 'threat:*',
        }),
      })
    );
  });
});
