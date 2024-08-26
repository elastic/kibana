/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  RuleFieldsToUpgrade,
  DiffableUpgradableFields,
  DiffableRule,
  DiffableAllFields,
  DiffableRuleTypes,
} from './diffable_rule';
import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';

describe('Diffable rule schema', () => {
  describe('DiffableAllFields', () => {
    it('includes all possible rules types listed in the diffable rule schemas', () => {
      const diffableAllFieldsRuleTypes = DiffableAllFields.shape.type.options.map((x) => x.value);
      const diffableRuleTypes = DiffableRuleTypes.options.map((x) => x.value);
      expect(diffableAllFieldsRuleTypes).toStrictEqual(diffableRuleTypes);
    });
  });

  describe('DiffableRule', () => {
    it('includes all possible rules types listed in the diffable rule schemas', () => {
      const diffableRuleTypes = DiffableRule._def.right._def.options.map((x) => x.shape.type.value);
      const ruleTypes = DiffableRuleTypes.options.map((x) => x.value);
      expect(diffableRuleTypes).toStrictEqual(ruleTypes);
    });
  });

  describe('RuleFieldsToUpgrade', () => {
    it('contains only upgradable fields defined in the diffable rule schemas', () => {
      expect(Object.keys(RuleFieldsToUpgrade.shape)).toStrictEqual(
        Object.keys(DiffableUpgradableFields.shape)
      );
    });

    describe('correctly validates valid and invalid inputs', () => {
      it('validates 5 valid cases: BASE, CURRENT, TARGET, MERGED, RESOLVED', () => {
        const validInputs = [
          {
            name: {
              pick_version: 'BASE',
            },
          },
          {
            description: {
              pick_version: 'CURRENT',
            },
          },
          {
            risk_score: {
              pick_version: 'TARGET',
            },
          },
          {
            note: {
              pick_version: 'MERGED',
            },
          },
          {
            references: {
              pick_version: 'RESOLVED',
              resolved_value: ['www.link1.com', 'www.link2.com'],
            },
          },
        ];

        validInputs.forEach((input) => {
          const result = RuleFieldsToUpgrade.safeParse(input);
          expectParseSuccess(result);
          expect(result.data).toEqual(input);
        });
      });

      it('does not validate invalid combination of pick_version and resolved_value', () => {
        const input = {
          references: {
            pick_version: 'MERGED',
            resolved_value: ['www.link1.com', 'www.link2.com'],
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"references: Unrecognized key(s) in object: 'resolved_value'"`
        );
      });

      it('invalidates incorrect types of resolved_values provided to multiple fields', () => {
        const input = {
          references: {
            pick_version: 'RESOLVED',
            resolved_value: 'www.link1.com',
          },
          tags: {
            pick_version: 'RESOLVED',
            resolved_value: 4,
          },
          name: {
            pick_version: 'RESOLVED',
            resolved_value: 'Valid type name',
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"tags.resolved_value: Expected array, received number, references.resolved_value: Expected array, received string"`
        );
      });

      it('invalidates unknown fields', () => {
        const input = {
          unknown_field: {
            pick_version: 'CURRENT',
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Unrecognized key(s) in object: 'unknown_field'"`
        );
      });

      it('invalidates rule fields not part of RuleFieldsToUpgrade', () => {
        const input = {
          type: {
            pick_version: 'BASE',
          },
          rule_id: {
            pick_version: 'CURRENT',
          },
          version: {
            pick_version: 'TARGET',
          },
          author: {
            pick_version: 'MERGED',
          },
          license: {
            pick_version: 'RESOLVED',
            resolved_value: 'Elastic License',
          },
          concurrent_searches: {
            pick_version: 'TARGET',
          },
          items_per_search: {
            pick_version: 'TARGET',
          },
        };
        const result = RuleFieldsToUpgrade.safeParse(input);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Unrecognized key(s) in object: 'type', 'rule_id', 'version', 'author', 'license', 'concurrent_searches', 'items_per_search'"`
        );
      });
    });
  });
});
