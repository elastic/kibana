/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getPrepackagedRules } from './get_prepackaged_rules';
import { isEmpty } from 'lodash/fp';
import { AddPrepackagedRulesSchemaDecoded } from '../../../../common/detection_engine/schemas/request/add_prepackaged_rules_schema';

describe('get_existing_prepackaged_rules', () => {
  test('should not throw any errors with the existing checked in pre-packaged rules', () => {
    expect(() => getPrepackagedRules()).not.toThrow();
  });

  test('no rule should have the same rule_id as another rule_id', () => {
    const prePackagedRules = getPrepackagedRules();
    let existingRuleIds: AddPrepackagedRulesSchemaDecoded[] = [];
    prePackagedRules.forEach((rule) => {
      const foundDuplicate = existingRuleIds.reduce((accum, existingRule) => {
        if (existingRule.rule_id === rule.rule_id) {
          return `Found duplicate rule_id of ${rule.rule_id} between these two rule names of "${rule.name}" and "${existingRule.name}"`;
        } else {
          return accum;
        }
      }, '');
      if (!isEmpty(foundDuplicate)) {
        expect(foundDuplicate).toEqual('');
      } else {
        existingRuleIds = [...existingRuleIds, rule];
      }
    });
  });

  test('should throw an exception if a pre-packaged rule is not valid', () => {
    // @ts-expect-error intentionally invalid argument
    expect(() => getPrepackagedRules([{ not_valid_made_up_key: true }])).toThrow(
      'name: "(rule name unknown)", rule_id: "(rule rule_id unknown)" within the folder rules/prepackaged_rules is not a valid detection engine rule. Expect the system to not work with pre-packaged rules until this rule is fixed or the file is removed. Error is: Invalid value "undefined" supplied to "description",Invalid value "undefined" supplied to "risk_score",Invalid value "undefined" supplied to "name",Invalid value "undefined" supplied to "severity",Invalid value "undefined" supplied to "type",Invalid value "undefined" supplied to "rule_id",Invalid value "undefined" supplied to "version", Full rule contents are:\n{\n  "not_valid_made_up_key": true\n}'
    );
  });

  test('should throw an exception with a message having rule_id and name in it', () => {
    expect(() =>
      // @ts-expect-error intentionally invalid argument
      getPrepackagedRules([{ name: 'rule name', rule_id: 'id-123' }])
    ).toThrow(
      'name: "rule name", rule_id: "id-123" within the folder rules/prepackaged_rules is not a valid detection engine rule. Expect the system to not work with pre-packaged rules until this rule is fixed or the file is removed. Error is: Invalid value "undefined" supplied to "description",Invalid value "undefined" supplied to "risk_score",Invalid value "undefined" supplied to "severity",Invalid value "undefined" supplied to "type",Invalid value "undefined" supplied to "version", Full rule contents are:\n{\n  "name": "rule name",\n  "rule_id": "id-123"\n}'
    );
  });
});
