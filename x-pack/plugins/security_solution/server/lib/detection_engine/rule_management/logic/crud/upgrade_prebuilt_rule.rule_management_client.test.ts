/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/mocks';

import { upgradePrebuiltRule } from './rules_management_client';

import {
  getCreateEqlRuleSchemaMock,
  getCreateRulesSchemaMock,
} from '../../../../../../common/api/detection_engine/model/rule_schema/mocks';
import type { PrebuiltRuleAsset } from '../../../prebuilt_rules';

import { readRules } from './read_rules';
import { getRuleMock } from '../../../routes/__mocks__/request_responses';
import { getEqlRuleParams, getQueryRuleParams } from '../../../rule_schema/mocks';

jest.mock('./read_rules');

describe('RuleManagementClient.upgradePrebuiltRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    // jest.resetAllMocks();
    rulesClient = rulesClientMock.create();
  });

  it('throws if no matching rule_id is found', async () => {
    const ruleAsset: PrebuiltRuleAsset = {
      ...getCreateRulesSchemaMock(),
      version: 1,
      rule_id: 'rule-id',
    };
    // Read rules must return that it didn't find any matching rules so this fails
    (readRules as jest.Mock).mockResolvedValue(null);
    await expect(upgradePrebuiltRule(rulesClient, { ruleAsset })).rejects.toThrow(
      `Failed to find rule ${ruleAsset.rule_id}`
    );
  });

  describe('if the new version has a different type than the existing version', () => {
    // New version is "eql"
    const ruleAsset: PrebuiltRuleAsset = {
      ...getCreateEqlRuleSchemaMock(),
      tags: ['test'],
      type: 'eql',
      version: 1,
      rule_id: 'rule-id',
    };
    // Installed version is "query"
    const installedRule = getRuleMock({
      ...getQueryRuleParams({
        exceptionsList: [
          { id: 'test_id', list_id: 'hi', type: 'detection', namespace_type: 'agnostic' },
        ],
      }),
      actions: [
        {
          group: 'default',
          id: 'test_id',
          action_type_id: '.index',
          config: {
            index: ['index-1', 'index-2'],
          },
        },
      ],
      ruleId: 'rule-id',
    });
    beforeEach(() => {
      (readRules as jest.Mock).mockResolvedValue(installedRule);
    });

    it('deletes the old rule ', async () => {
      await upgradePrebuiltRule(rulesClient, { ruleAsset });
      expect(rulesClient.delete).toHaveBeenCalled();
    });

    it('creates a new rule with the new type and expected params of the original rules', async () => {
      await upgradePrebuiltRule(rulesClient, { ruleAsset });
      expect(rulesClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: ruleAsset.name,
            tags: ruleAsset.tags,
            // enabled and actions are kept from original rule
            actions: installedRule.actions,
            enabled: installedRule.enabled,
            params: expect.objectContaining({
              index: ruleAsset.index,
              description: ruleAsset.description,
              immutable: true,
              // exceptions_lists, actions, timeline_id and timeline_title are maintained
              timelineTitle: installedRule.params.timelineTitle,
              timelineId: installedRule.params.timelineId,
              exceptionsList: installedRule.params.exceptionsList,
            }),
          }),
          options: {
            id: installedRule.id, // id is maintained
          },
          allowMissingConnectorSecrets: undefined,
        })
      );
    });
  });

  describe('if the new version has the same type than the existing version', () => {
    // New version is "eql"
    const ruleAsset: PrebuiltRuleAsset = {
      ...getCreateEqlRuleSchemaMock(),
      tags: ['test'],
      type: 'eql',
      version: 1,
      rule_id: 'rule-id',
    };
    // Installed version is "eql"
    const installedRule = getRuleMock({
      ...getEqlRuleParams(),
    });
    beforeEach(() => {
      (readRules as jest.Mock).mockResolvedValue(installedRule);
    });

    it('patches the existing rule with the new params from the rule asset', async () => {
      await upgradePrebuiltRule(rulesClient, { ruleAsset });
      expect(rulesClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: ruleAsset.name,
            tags: ruleAsset.tags,
            params: expect.objectContaining({
              index: ruleAsset.index,
              description: ruleAsset.description,
            }),
          }),
          id: installedRule.id,
        })
      );
    });
  });
});
