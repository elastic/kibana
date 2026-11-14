/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { validateTailSamplingPolicies } from './validate_policies';

const keepErrors = {
  name: 'keep-errors',
  type: 'status_code',
  status_code: { status_codes: ['ERROR'] },
};

describe('validateTailSamplingPolicies', () => {
  it('accepts a valid policy', () => {
    expect(validateTailSamplingPolicies([keepErrors])).toEqual([]);
  });

  it('rejects an empty list', () => {
    expect(validateTailSamplingPolicies([]).map((d) => d.code)).toEqual(['no_policies']);
  });

  it('rejects an unknown policy type', () => {
    const [diagnostic] = validateTailSamplingPolicies([{ name: 'x', type: 'nope' }]);
    expect(diagnostic).toMatchObject({
      code: 'unknown_policy_type',
      policyIndex: 0,
      path: ['type'],
    });
  });

  it('rejects an unknown key in a policy block', () => {
    const [diagnostic] = validateTailSamplingPolicies([
      { ...keepErrors, status_code: { status_codes: ['ERROR'], extra: true } },
    ]);
    expect(diagnostic).toMatchObject({ code: 'invalid_field', policyIndex: 0 });
  });

  it('rejects a value out of range, with the path to the field', () => {
    const [diagnostic] = validateTailSamplingPolicies([
      { name: 'p', type: 'probabilistic', probabilistic: { sampling_percentage: 150 } },
    ]);
    expect(diagnostic).toMatchObject({
      code: 'invalid_field',
      path: ['probabilistic', 'sampling_percentage'],
    });
  });

  it('rejects a duplicate name', () => {
    const diagnostics = validateTailSamplingPolicies([keepErrors, keepErrors]);
    expect(diagnostics).toEqual([
      expect.objectContaining({
        code: 'duplicate_name',
        policyIndex: 1,
        policyName: 'keep-errors',
      }),
    ]);
  });

  it.each([
    ['rate_limiting', { rate_limiting: { spans_per_second: 100 } }],
    ['bytes_limiting', { bytes_limiting: { bytes_per_second: 1000 } }],
  ])('accepts %s', (type, block) => {
    expect(validateTailSamplingPolicies([{ name: 'limit', type, ...block }])).toEqual([]);
  });

  describe('nesting', () => {
    // Matches every trace that is not a health check.
    const notHealthCheck = {
      name: 'not-health-check',
      type: 'not',
      not: {
        not_sub_policy: {
          name: 'health-check',
          type: 'string_attribute',
          string_attribute: { key: 'url.path', values: ['/health'] },
        },
      },
    };
    // Keeps errors, except the ones from the health check.
    const errorsExceptHealthCheck = {
      name: 'errors-except-health-check',
      type: 'and',
      and: { and_sub_policy: [keepErrors, notHealthCheck] },
    };
    // Matches every trace that is not from production.
    const notProduction = {
      name: 'not-production',
      type: 'not',
      not: {
        not_sub_policy: {
          name: 'production',
          type: 'string_attribute',
          string_attribute: { key: 'deployment.environment', values: ['production'] },
        },
      },
    };

    it('accepts a not policy inside an and policy', () => {
      expect(validateTailSamplingPolicies([errorsExceptHealthCheck])).toEqual([]);
    });

    it('accepts a not policy inside a drop policy', () => {
      expect(
        validateTailSamplingPolicies([
          { name: 'drop-non-production', type: 'drop', drop: { drop_sub_policy: [notProduction] } },
        ])
      ).toEqual([]);
    });

    it('accepts an and policy inside a composite policy', () => {
      expect(
        validateTailSamplingPolicies([
          {
            name: 'budget',
            type: 'composite',
            composite: {
              max_total_spans_per_second: 1000,
              policy_order: ['errors-except-health-check'],
              composite_sub_policy: [errorsExceptHealthCheck],
            },
          },
        ])
      ).toEqual([]);
    });

    it('rejects an and policy inside an and policy', () => {
      const diagnostics = validateTailSamplingPolicies([
        { name: 'outer', type: 'and', and: { and_sub_policy: [errorsExceptHealthCheck] } },
      ]);
      expect(diagnostics.map((d) => d.code)).toEqual(['invalid_field']);
    });

    it('rejects a not policy inside a not policy', () => {
      const diagnostics = validateTailSamplingPolicies([
        { name: 'outer', type: 'not', not: { not_sub_policy: notHealthCheck } },
      ]);
      expect(diagnostics.map((d) => d.code)).toEqual(['invalid_field']);
    });
  });

  it('rejects a decimal numeric_attribute bound', () => {
    const [diagnostic] = validateTailSamplingPolicies([
      { name: 'n', type: 'numeric_attribute', numeric_attribute: { key: 'k', min_value: 1.5 } },
    ]);
    expect(diagnostic).toMatchObject({
      code: 'invalid_field',
      path: ['numeric_attribute', 'min_value'],
    });
  });

  it('accepts a span_count policy with only max_spans', () => {
    expect(
      validateTailSamplingPolicies([
        { name: 'small', type: 'span_count', span_count: { max_spans: 20 } },
      ])
    ).toEqual([]);
  });

  it('rejects a span_count policy without min_spans and max_spans', () => {
    const diagnostics = validateTailSamplingPolicies([
      { name: 'empty', type: 'span_count', span_count: {} },
    ]);
    expect(diagnostics.map((d) => d.code)).toEqual(['invalid_field']);
  });

  it('accepts a composite policy', () => {
    expect(
      validateTailSamplingPolicies([
        {
          name: 'budget',
          type: 'composite',
          composite: {
            max_total_spans_per_second: 1000,
            policy_order: ['keep-errors'],
            composite_sub_policy: [keepErrors],
          },
        },
      ])
    ).toEqual([]);
  });
});
