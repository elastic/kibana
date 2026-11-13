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
      expect.objectContaining({ code: 'duplicate_name', policyIndex: 1, policyName: 'keep-errors' }),
    ]);
  });

  it.each([
    ['rate_limiting', { rate_limiting: { spans_per_second: 100 } }],
    ['bytes_limiting', { bytes_limiting: { bytes_per_second: 1000 } }],
  ])('accepts %s', (type, block) => {
    expect(validateTailSamplingPolicies([{ name: 'limit', type, ...block }])).toEqual([]);
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
