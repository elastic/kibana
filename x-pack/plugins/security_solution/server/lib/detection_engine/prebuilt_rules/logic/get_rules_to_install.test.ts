/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesToInstall } from './get_rules_to_install';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getPrebuiltRuleMock } from '../mocks';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { rulesToMap } from './utils';

describe('get_rules_to_install', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToInstall([], rulesToMap([]));
    expect(update).toEqual([]);
  });

  test('should return empty array if the two rule ids match', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    const update = getRulesToInstall([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([]);
  });

  test('should return the rule to install if the id of the two rules do not match', () => {
    const ruleAsset = getPrebuiltRuleMock();
    ruleAsset.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    const update = getRulesToInstall([ruleAsset], rulesToMap([installedRule]));
    expect(update).toEqual([ruleAsset]);
  });

  test('should return two rules to install if both the ids of the two rules do not match', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.rule_id = 'rule-1';

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.rule_id = 'rule-2';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall([ruleAsset1, ruleAsset2], rulesToMap([installedRule]));
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });

  test('should return two rules of three to install if both the ids of the two rules do not match but the third does', () => {
    const ruleAsset1 = getPrebuiltRuleMock();
    ruleAsset1.rule_id = 'rule-1';

    const ruleAsset2 = getPrebuiltRuleMock();
    ruleAsset2.rule_id = 'rule-2';

    const ruleAsset3 = getPrebuiltRuleMock();
    ruleAsset3.rule_id = 'rule-3';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall(
      [ruleAsset1, ruleAsset2, ruleAsset3],
      rulesToMap([installedRule])
    );
    expect(update).toEqual([ruleAsset1, ruleAsset2]);
  });
});
