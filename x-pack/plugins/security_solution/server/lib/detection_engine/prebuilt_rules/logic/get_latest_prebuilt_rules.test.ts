/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEmpty } from 'lodash/fp';
import type { PrebuiltRuleToInstall } from '../../../../../common/detection_engine/prebuilt_rules';
import { getFilesystemRules } from './get_latest_prebuilt_rules';

describe('Get latest prebuilt rules', () => {
  describe('getFilesystemRules', () => {
    test('should not throw any errors with the existing checked in pre-packaged rules', () => {
      expect(() => getFilesystemRules()).not.toThrow();
    });

    test('no rule should have the same rule_id as another rule_id', () => {
      const prebuiltRules = getFilesystemRules();
      let existingRuleIds: PrebuiltRuleToInstall[] = [];
      prebuiltRules.forEach((rule) => {
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
      expect(() => getFilesystemRules([{ not_valid_made_up_key: true }])).toThrow();
    });

    test('should throw an exception with a message having rule_id and name in it', () => {
      expect(() =>
        // @ts-expect-error intentionally invalid argument
        getFilesystemRules([{ name: 'rule name', rule_id: 'id-123' }])
      ).toThrow();
    });
  });
});
