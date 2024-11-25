/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertDiffableFieldsMatchRuleType } from './assert_diffable_fields_match_rule_type';
import { DIFFABLE_RULE_TYPE_FIELDS_MAP } from '../../../../../../common/api/detection_engine';

describe('assertDiffableFieldsMatchRuleType', () => {
  describe('valid scenarios -', () => {
    it('should validate all fields in DIFFABLE_RULE_TYPE_FIELDS_MAP', () => {
      DIFFABLE_RULE_TYPE_FIELDS_MAP.forEach((fields, ruleType) => {
        expect(() => {
          assertDiffableFieldsMatchRuleType(fields, ruleType);
        }).not.toThrow();
      });
    });

    it('should not throw an error for valid upgradeable fields', () => {
      expect(() => {
        assertDiffableFieldsMatchRuleType(['name', 'description', 'severity'], 'query');
      }).not.toThrow();
    });

    it('should handle valid rule type correctly', () => {
      expect(() => {
        assertDiffableFieldsMatchRuleType(['eql_query'], 'eql');
      }).not.toThrow();
    });

    it('should handle empty upgradeable fields array', () => {
      expect(() => {
        assertDiffableFieldsMatchRuleType([], 'query');
      }).not.toThrow();
    });
  });

  describe('invalid scenarios -', () => {
    it('should throw an error for invalid upgradeable fields', () => {
      expect(() => {
        assertDiffableFieldsMatchRuleType(['invalid_field'], 'query');
      }).toThrow("invalid_field is not a valid upgradeable field for type 'query'");
    });

    it('should throw for incompatible rule types', () => {
      expect(() => {
        assertDiffableFieldsMatchRuleType(['eql_query'], 'query');
      }).toThrow("eql_query is not a valid upgradeable field for type 'query'");
    });

    it('should throw an error for an unknown rule type', () => {
      expect(() => {
        // @ts-expect-error - unknown rule
        assertDiffableFieldsMatchRuleType(['name'], 'unknown_type');
      }).toThrow();
    });
  });
});
