/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import {
  getRuleMock,
  getFindResultWithSingleHit,
} from '../../../routes/__mocks__/request_responses';
import { upgradePrebuiltRules } from './upgrade_prebuilt_rules';
import { patchRules } from '../../../rule_management/logic/crud/patch_rules';
import { getPrebuiltRuleMock, getPrebuiltThreatMatchRuleMock } from '../../mocks';
import { getThreatRuleParams } from '../../../rule_schema/mocks';

jest.mock('../../../rule_management/logic/crud/patch_rules');

describe('updatePrebuiltRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
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

    await upgradePrebuiltRules(rulesClient, [{ ...prepackagedRule, actions }]);

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

    await upgradePrebuiltRules(rulesClient, [{ ...prepackagedRule, ...updatedThreatParams }]);

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
