/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filterInstalledRules, getRulesToUpdate, mergeExceptionLists } from './get_rules_to_update';
import { getAlertMock } from '../routes/__mocks__/request_responses';
import { getAddPrepackagedRulesSchemaDecodedMock } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema.mock';
import { getQueryRuleParams } from '../schemas/rule_schemas.mock';

describe('get_rules_to_update', () => {
  test('should return empty array if both rule sets are empty', () => {
    const update = getRulesToUpdate([], []);
    expect(update).toEqual([]);
  });

  test('should return empty array if the rule_id of the two rules do not match', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is less than the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return empty array if the version of file system rule is the same as the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([]);
  });

  test('should return the rule to update if the version of file system rule is greater than the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    installedRule.params.exceptionsList = [];

    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule]);
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return 1 rule out of 2 to update if the version of file system rule is greater than the installed version of just one', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const installedRule2 = getAlertMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [];

    const update = getRulesToUpdate([ruleFromFileSystem], [installedRule1, installedRule2]);
    expect(update).toEqual([ruleFromFileSystem]);
  });

  test('should return 2 rules out of 2 to update if the version of file system rule is greater than the installed version of both', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const ruleFromFileSystem2 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem2.rule_id = 'rule-2';
    ruleFromFileSystem2.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const installedRule2 = getAlertMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [];

    const update = getRulesToUpdate(
      [ruleFromFileSystem1, ruleFromFileSystem2],
      [installedRule1, installedRule2]
    );
    expect(update).toEqual([ruleFromFileSystem1, ruleFromFileSystem2]);
  });

  test('should add back an exception_list if it was removed by the end user on an immutable rule during an upgrade', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const [update] = getRulesToUpdate([ruleFromFileSystem1], [installedRule1]);
    expect(update.exceptions_list).toEqual(ruleFromFileSystem1.exceptions_list);
  });

  test('should not remove an additional exception_list if an additional one was added by the end user on an immutable rule during an upgrade', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const [update] = getRulesToUpdate([ruleFromFileSystem1], [installedRule1]);
    expect(update.exceptions_list).toEqual([
      ...ruleFromFileSystem1.exceptions_list,
      ...installedRule1.params.exceptionsList,
    ]);
  });

  test('should not remove an existing exception_list if they are the same between the current installed one and the upgraded one', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update] = getRulesToUpdate([ruleFromFileSystem1], [installedRule1]);
    expect(update.exceptions_list).toEqual(ruleFromFileSystem1.exceptions_list);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update] = getRulesToUpdate([ruleFromFileSystem1], [installedRule1]);
    expect(update.exceptions_list).toEqual(installedRule1.params.exceptionsList);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list for multiple rules', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const ruleFromFileSystem2 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem2.exceptions_list = [];
    ruleFromFileSystem2.rule_id = 'rule-2';
    ruleFromFileSystem2.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    const installedRule2 = getAlertMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update1, update2] = getRulesToUpdate(
      [ruleFromFileSystem1, ruleFromFileSystem2],
      [installedRule1, installedRule2]
    );
    expect(update1.exceptions_list).toEqual(installedRule1.params.exceptionsList);
    expect(update2.exceptions_list).toEqual(installedRule2.params.exceptionsList);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list for mixed rules', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const ruleFromFileSystem2 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem2.exceptions_list = [];
    ruleFromFileSystem2.rule_id = 'rule-2';
    ruleFromFileSystem2.version = 2;
    ruleFromFileSystem2.exceptions_list = [
      {
        id: 'second_list',
        list_id: 'second_list',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const installedRule2 = getAlertMock(getQueryRuleParams());
    installedRule2.params.ruleId = 'rule-2';
    installedRule2.params.version = 1;
    installedRule2.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const [update1, update2] = getRulesToUpdate(
      [ruleFromFileSystem1, ruleFromFileSystem2],
      [installedRule1, installedRule2]
    );
    expect(update1.exceptions_list).toEqual(installedRule1.params.exceptionsList);
    expect(update2.exceptions_list).toEqual([
      ...ruleFromFileSystem2.exceptions_list,
      ...installedRule2.params.exceptionsList,
    ]);
  });
});

describe('filterInstalledRules', () => {
  test('should return "false" if the id of the two rules do not match', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-2';
    installedRule.params.version = 1;
    const shouldUpdate = filterInstalledRules(ruleFromFileSystem, [installedRule]);
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "false" if the version of file system rule is less than the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 2;
    const shouldUpdate = filterInstalledRules(ruleFromFileSystem, [installedRule]);
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "false" if the version of file system rule is the same as the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 1;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    const shouldUpdate = filterInstalledRules(ruleFromFileSystem, [installedRule]);
    expect(shouldUpdate).toEqual(false);
  });

  test('should return "true" to update if the version of file system rule is greater than the installed version', () => {
    const ruleFromFileSystem = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem.rule_id = 'rule-1';
    ruleFromFileSystem.version = 2;

    const installedRule = getAlertMock(getQueryRuleParams());
    installedRule.params.ruleId = 'rule-1';
    installedRule.params.version = 1;
    installedRule.params.exceptionsList = [];

    const shouldUpdate = filterInstalledRules(ruleFromFileSystem, [installedRule]);
    expect(shouldUpdate).toEqual(true);
  });
});

describe('mergeExceptionLists', () => {
  test('should add back an exception_list if it was removed by the end user on an immutable rule during an upgrade', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [];

    const update = mergeExceptionLists(ruleFromFileSystem1, [installedRule1]);
    expect(update.exceptions_list).toEqual(ruleFromFileSystem1.exceptions_list);
  });

  test('should not remove an additional exception_list if an additional one was added by the end user on an immutable rule during an upgrade', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'second_exception_list',
        list_id: 'some-other-id',
        namespace_type: 'single',
        type: 'detection',
      },
    ];

    const update = mergeExceptionLists(ruleFromFileSystem1, [installedRule1]);
    expect(update.exceptions_list).toEqual([
      ...ruleFromFileSystem1.exceptions_list,
      ...installedRule1.params.exceptionsList,
    ]);
  });

  test('should not remove an existing exception_list if they are the same between the current installed one and the upgraded one', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleFromFileSystem1, [installedRule1]);
    expect(update.exceptions_list).toEqual(ruleFromFileSystem1.exceptions_list);
  });

  test('should not remove an existing exception_list if the rule has an empty exceptions list', () => {
    const ruleFromFileSystem1 = getAddPrepackagedRulesSchemaDecodedMock();
    ruleFromFileSystem1.exceptions_list = [];
    ruleFromFileSystem1.rule_id = 'rule-1';
    ruleFromFileSystem1.version = 2;

    const installedRule1 = getAlertMock(getQueryRuleParams());
    installedRule1.params.ruleId = 'rule-1';
    installedRule1.params.version = 1;
    installedRule1.params.exceptionsList = [
      {
        id: 'endpoint_list',
        list_id: 'endpoint_list',
        namespace_type: 'agnostic',
        type: 'endpoint',
      },
    ];

    const update = mergeExceptionLists(ruleFromFileSystem1, [installedRule1]);
    expect(update.exceptions_list).toEqual(installedRule1.params.exceptionsList);
  });
});
