/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';
import {
  getRuleMock,
  getFindResultWithSingleHit,
  getFindResultWithMultiHits,
} from '../../../routes/__mocks__/request_responses';
import { upgradePrebuiltRules } from './upgrade_prebuilt_rules';
import { patchRules } from '../../../rule_management/logic/crud/patch_rules';
import { createRules } from '../../../rule_management/logic/crud/create_rules';
import { deleteRules } from '../../../rule_management/logic/crud/delete_rules';
import { getPrebuiltRuleMock, getPrebuiltThreatMatchRuleMock } from '../../mocks';
import { getQueryRuleParams, getThreatRuleParams } from '../../../rule_schema/mocks';

jest.mock('../../../rule_management/logic/crud/patch_rules');
jest.mock('../../../rule_management/logic/crud/create_rules');
jest.mock('../../../rule_management/logic/crud/delete_rules');

describe('updatePrebuiltRules', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  describe('when upgrading a prebuilt rule to a newer version with the same rule type', () => {
    const prepackagedRule = getPrebuiltRuleMock({
      rule_id: 'rule-to-upgrade',
    });

    beforeEach(() => {
      const installedRule = getRuleMock(
        getQueryRuleParams({
          ruleId: 'rule-to-upgrade',
        })
      );

      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [installedRule],
        })
      );
    });

    it('patches existing rule with incoming version data', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(patchRules).toHaveBeenCalledWith(
        expect.objectContaining({
          nextParams: expect.objectContaining(prepackagedRule),
        })
      );
    });

    it('makes sure enabled state is preserved', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(patchRules).toHaveBeenCalledWith(
        expect.objectContaining({
          nextParams: expect.objectContaining({
            enabled: undefined,
          }),
        })
      );
    });
  });

  describe('when upgrading a prebuilt rule to a newer version with a different rule type', () => {
    const prepackagedRule = getPrebuiltRuleMock({
      rule_id: 'rule-to-upgrade',
      type: 'eql',
      language: 'eql',
      query: 'host where host.name == "something"',
    });
    const actions = [
      {
        group: 'group',
        id: 'id',
        actionTypeId: 'action_type_id',
        params: {},
      },
    ];
    const installedRule = getRuleMock(
      getQueryRuleParams({
        ruleId: 'rule-to-upgrade',
        type: 'query',
        exceptionsList: [
          {
            id: 'exception_list_1',
            list_id: 'exception_list_1',
            namespace_type: 'agnostic',
            type: 'rule_default',
          },
        ],
        timelineId: 'some-timeline-id',
        timelineTitle: 'Some timeline title',
      }),
      {
        id: 'installed-rule-so-id',
        actions,
      }
    );

    beforeEach(() => {
      rulesClient.find.mockResolvedValue(
        getFindResultWithMultiHits({
          data: [installedRule],
        })
      );
    });

    it('deletes rule before creation', async () => {
      let lastCalled!: string;

      (deleteRules as jest.Mock).mockImplementation(() => (lastCalled = 'deleteRules'));
      (createRules as jest.Mock).mockImplementation(() => (lastCalled = 'createRules'));

      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(deleteRules).toHaveBeenCalledTimes(1);
      expect(createRules).toHaveBeenCalledTimes(1);
      expect(lastCalled).toBe('createRules');
    });

    it('recreates a rule with incoming version data', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          immutable: true,
          params: expect.objectContaining(prepackagedRule),
        })
      );
    });

    it('restores saved object id', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'installed-rule-so-id',
        })
      );
    });

    it('restores enabled state', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ enabled: installedRule.enabled }),
        })
      );
    });

    it('restores actions', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            actions: actions.map((a) => ({
              ...omit(a, 'actionTypeId'),
              action_type_id: a.actionTypeId,
            })),
          }),
        })
      );
    });

    it('restores exceptions list', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({ exceptions_list: installedRule.params.exceptionsList }),
        })
      );
    });

    it('restores timeline reference', async () => {
      await upgradePrebuiltRules(rulesClient, [prepackagedRule]);

      expect(createRules).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            timeline_id: installedRule.params.timelineId,
            timeline_title: installedRule.params.timelineTitle,
          }),
        })
      );
    });
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
