/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRulesToInstall } from './get_rules_to_install';
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { getAddPrepackagedRulesSchemaDecodedMock } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request';

describe('get_rules_to_install', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToInstall([], []);
    expect(update).toEqual([]);
  });

  test('should return empty array if the two rule ids match', () => {
    const ruleFromFileSystem =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem.rule_id = 'rule-1';

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    const update = getRulesToInstall([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return the rule to install if the id of the two rules do not match', () => {
    const ruleFromFileSystem =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem.rule_id = 'rule-1';

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    const update = getRulesToInstall([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return two rules to install if both the ids of the two rules do not match', () => {
    const ruleFromFileSystem1 =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem1.rule_id = 'rule-1';

    const ruleFromFileSystem2 =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem2.rule_id = 'rule-2';

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall([ruleFromFileSystem1, ruleFromFileSystem2], [installedRule]);
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });

  test('should return two rules of three to install if both the ids of the two rules do not match but the third does', () => {
    const ruleFromFileSystem1 =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem1.rule_id = 'rule-1';

    const ruleFromFileSystem2 =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem2.rule_id = 'rule-2';

    const ruleFromFileSystem3 =
      getAddPrepackagedRulesSchemaDecodedMock() as AddPrepackagedRulesSchemaDecoded;
    ruleFromFileSystem3.rule_id = 'rule-3';

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-3';
    const update = getRulesToInstall(
      [ruleFromFileSystem1, ruleFromFileSystem2, ruleFromFileSystem3],
      [installedRule]
    );
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });
});
