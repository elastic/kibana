/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess, stringifyZodError } from '@kbn/zod-helpers';
import {
  PickVersionValues,
  RuleUpgradeSpecifier,
  RuleUpgradeSpecifierFields,
  UpgradeSpecificRulesRequest,
  UpgradeAllRulesRequest,
  PerformRuleUpgradeResponseBody,
  PerformRuleUpgradeRequestBody,
} from './perform_rule_upgrade_route';
import { RULE_UPGRADE_SPECIFIER_FIELDS } from '../../../../../server/lib/detection_engine/prebuilt_rules/model/rule_assets/prebuilt_rule_asset';


describe('Perform Rule Upgrade Route Schemas', () => {
  describe('PickVersionValues', () => {
    test('validates correct enum values', () => {
      const validValues = ['BASE', 'CURRENT', 'TARGET', 'MERGED'];
      validValues.forEach((value) => {
        const result = PickVersionValues.safeParse(value);
        expectParseSuccess(result);
        expect(result.data).toBe(value);
      });
    });

    test('rejects invalid enum values', () => {
      const invalidValues = ['RESOLVED', 'MALFORMED_STRING'];
      invalidValues.forEach((value) => {
        const result = PickVersionValues.safeParse(value);
        expectParseError(result);
        expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
          `"Invalid enum value. Expected 'BASE' | 'CURRENT' | 'TARGET' | 'MERGED', received '${value}'"`
        );
      });
    });
  });

  describe('RuleUpgradeSpecifierFields', () => {
    it.only('accepts all upgradable fields from the Prebuilt Rule Asset', () => {
      const upgradeSpecifierFields = new Set(Object.keys(RuleUpgradeSpecifierFields.shape));

      expect(upgradeSpecifierFields).toEqual(RULE_UPGRADE_SPECIFIER_FIELDS);

    })
  })

  describe('RuleUpgradeSpecifier', () => {
    const validSpecifier = {
      rule_id: 'rule-1',
      revision: 1,
      version: 1,
      pick_version: 'TARGET',
    };

    test('validates a valid upgrade specifier without fields property', () => {
      const result = RuleUpgradeSpecifier.safeParse(validSpecifier);
      expectParseSuccess(result);
      expect(result.data).toEqual(validSpecifier);
    });

    test('validates a valid upgrade specifier with a fields property', () => {
      const specifierWithFields = {
        ...validSpecifier,
        fields: {
          name: {
            pick_version: 'CURRENT',
          },
        },
      };
      const result = RuleUpgradeSpecifier.safeParse(specifierWithFields);
      expectParseSuccess(result);
      expect(result.data).toEqual(specifierWithFields);
    });

    test('rejects upgrade specifier with invalid pick_version rule_id', () => {
      const invalid = { ...validSpecifier, rule_id: 123 };
      const result = RuleUpgradeSpecifier.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"rule_id: Expected string, received number"`
      );
    });
  });

  describe('UpgradeSpecificRulesRequest', () => {
    const validRequest = {
      mode: 'SPECIFIC_RULES',
      rules: [
        {
          rule_id: 'rule-1',
          revision: 1,
          version: 1,
        },
      ],
    };

    test('validates a correct upgrade specific rules request', () => {
      const result = UpgradeSpecificRulesRequest.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('rejects invalid mode', () => {
      const invalid = { ...validRequest, mode: 'INVALID_MODE' };
      const result = UpgradeSpecificRulesRequest.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"mode: Invalid literal value, expected \\"SPECIFIC_RULES\\""`
      );
    });

    test('rejects paylaod with missing rules array', () => {
      const invalid = { ...validRequest, rules: undefined };
      const result = UpgradeSpecificRulesRequest.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"rules: Required"`);
    });
  });

  describe('UpgradeAllRulesRequest', () => {
    const validRequest = {
      mode: 'ALL_RULES',
    };

    test('validates a correct upgrade all rules request', () => {
      const result = UpgradeAllRulesRequest.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('allows optional pick_version', () => {
      const withPickVersion = { ...validRequest, pick_version: 'BASE' };
      const result = UpgradeAllRulesRequest.safeParse(withPickVersion);
      expectParseSuccess(result);
      expect(result.data).toEqual(withPickVersion);
    });
  });

  describe('PerformRuleUpgradeRequestBody', () => {
    test('validates a correct upgrade specific rules request', () => {
      const validRequest = {
        mode: 'SPECIFIC_RULES',
        pick_version: 'BASE',
        rules: [
          {
            rule_id: 'rule-1',
            revision: 1,
            version: 1,
          },
        ],
      };
      const result = PerformRuleUpgradeRequestBody.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('validates a correct upgrade all rules request', () => {
      const validRequest = {
        mode: 'ALL_RULES',
        pick_version: 'BASE',
      };
      const result = PerformRuleUpgradeRequestBody.safeParse(validRequest);
      expectParseSuccess(result);
      expect(result.data).toEqual(validRequest);
    });

    test('rejects invalid mode', () => {
      const invalid = { mode: 'INVALID_MODE' };
      const result = PerformRuleUpgradeRequestBody.safeParse(invalid);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(
        `"mode: Invalid discriminator value. Expected 'ALL_RULES' | 'SPECIFIC_RULES'"`
      );
    });
  });
});

describe('PerformRuleUpgradeResponseBody', () => {
  const validResponse = {
    summary: {
      total: 1,
      succeeded: 1,
      skipped: 0,
      failed: 0,
    },
    results: {
      updated: [],
      skipped: [],
    },
    errors: [],
  };

  test('validates a correct perform rule upgrade response', () => {
    const result = PerformRuleUpgradeResponseBody.safeParse(validResponse);
    expectParseSuccess(result);
    expect(result.data).toEqual(validResponse);
  });

  test('rejects missing required fields', () => {
    const propsToDelete = Object.keys(validResponse);
    propsToDelete.forEach((deletedProp) => {
      const invalidResponse = Object.fromEntries(
        Object.entries(validResponse).filter(([key]) => key !== deletedProp)
      );
      const result = PerformRuleUpgradeResponseBody.safeParse(invalidResponse);
      expectParseError(result);
      expect(stringifyZodError(result.error)).toMatchInlineSnapshot(`"${deletedProp}: Required"`);
    });
  });
});
