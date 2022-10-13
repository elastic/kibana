/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesToInstall } from './get_rules_to_install';
import { getRuleMock } from '../../routes/__mocks__/request_responses';
import { getAddPrepackagedRulesSchemaMock } from '../../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import { prepackagedRulesToMap, rulesToMap } from './utils';

describe('get_rules_to_install', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToInstall(prepackagedRulesToMap([]), rulesToMap([]));
    expect(update).toEqual([]);
  });

  test('should return empty array if the two rule ids match', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    const update = getRulesToInstall(
      prepackagedRulesToMap([ruleFromFileSystem]),
      rulesToMap([installedRule])
    );
    expect(update).toEqual([]);
  });

  test('should return the rule to install if the id of the two rules do not match', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem.rule_id = 'rule-1';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    const update = getRulesToInstall(
      prepackagedRulesToMap([ruleFromFileSystem]),
      rulesToMap([installedRule])
    );
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return two rules to install if both the ids of the two rules do not match', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem1.rule_id = 'rule-1';

    const ruleFromFileSystem2 = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem2.rule_id = 'rule-2';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall(
      prepackagedRulesToMap([ruleFromFileSystem1, ruleFromFileSystem2]),
      rulesToMap([installedRule])
    );
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });

  test('should return two rules of three to install if both the ids of the two rules do not match but the third does', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem1.rule_id = 'rule-1';

    const ruleFromFileSystem2 = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem2.rule_id = 'rule-2';

    const ruleFromFileSystem3 = getAddPrepackagedRulesSchemaMock();
    ruleFromFileSystem3.rule_id = 'rule-3';

    const installedRule = getRuleMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall(
      prepackagedRulesToMap([ruleFromFileSystem1, ruleFromFileSystem2, ruleFromFileSystem3]),
      rulesToMap([installedRule])
    );
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });
});
