/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { TAIL_SAMPLING_WARNING_CODES } from '@kbn/apm-api-shared';
import { getTailSamplingPolicyWarnings } from './get_policy_warnings';

const keepErrors = {
  name: 'keep-errors',
  type: 'status_code',
  status_code: { status_codes: ['ERROR'] },
};
const spanKindCondition = {
  name: 'kind',
  type: 'ottl_condition',
  ottl_condition: { span: ['kind == SPAN_KIND_CLIENT'] },
};

describe('getTailSamplingPolicyWarnings', () => {
  it('returns no warnings for a plain policy', () => {
    expect(getTailSamplingPolicyWarnings([keepErrors])).toEqual([]);
  });

  describe('exit_spans_dropped', () => {
    it('warns on a drop policy with an ottl_condition on span kind', () => {
      const warnings = getTailSamplingPolicyWarnings([
        { name: 'drop-clients', type: 'drop', drop: { drop_sub_policy: [spanKindCondition] } },
      ]);
      expect(warnings).toEqual([
        expect.objectContaining({
          code: TAIL_SAMPLING_WARNING_CODES.EXIT_SPANS_DROPPED,
          policyIndex: 0,
          policyName: 'drop-clients',
        }),
      ]);
    });

    it('warns on a not policy with a string_attribute on span.kind', () => {
      const warnings = getTailSamplingPolicyWarnings([
        {
          name: 'keep-only-servers',
          type: 'not',
          not: {
            not_sub_policy: {
              name: 'server',
              type: 'string_attribute',
              string_attribute: { key: 'span.kind', values: ['server'] },
            },
          },
        },
      ]);
      expect(warnings.map((w) => w.code)).toEqual([TAIL_SAMPLING_WARNING_CODES.EXIT_SPANS_DROPPED]);
    });

    it('does not warn on a drop policy that conditions on something else', () => {
      expect(
        getTailSamplingPolicyWarnings([
          { name: 'drop-health', type: 'drop', drop: { drop_sub_policy: [keepErrors] } },
        ])
      ).toEqual([]);
    });

    it('does not warn on a span-kind condition outside drop and not', () => {
      expect(getTailSamplingPolicyWarnings([spanKindCondition])).toEqual([]);
    });
  });

  describe('rate_limit_per_replica', () => {
    it.each([
      ['rate_limiting', { rate_limiting: { spans_per_second: 100 } }],
      ['bytes_limiting', { bytes_limiting: { bytes_per_second: 1000 } }],
    ])('warns on a top-level %s policy', (type, block) => {
      const warnings = getTailSamplingPolicyWarnings([{ name: 'limit', type, ...block }]);
      expect(warnings).toEqual([
        expect.objectContaining({
          code: TAIL_SAMPLING_WARNING_CODES.RATE_LIMIT_PER_REPLICA,
          policyIndex: 0,
        }),
      ]);
    });

    it('warns on a composite policy', () => {
      const warnings = getTailSamplingPolicyWarnings([
        {
          name: 'budget',
          type: 'composite',
          composite: {
            max_total_spans_per_second: 1000,
            policy_order: ['keep-errors'],
            composite_sub_policy: [keepErrors],
          },
        },
      ]);
      expect(warnings.map((w) => w.code)).toEqual([
        TAIL_SAMPLING_WARNING_CODES.RATE_LIMIT_PER_REPLICA,
      ]);
    });

    it('warns on a rate limit nested in an and policy', () => {
      const warnings = getTailSamplingPolicyWarnings([
        {
          name: 'errors-limited',
          type: 'and',
          and: {
            and_sub_policy: [
              keepErrors,
              { name: 'limit', type: 'rate_limiting', rate_limiting: { spans_per_second: 100 } },
            ],
          },
        },
      ]);
      expect(warnings.map((w) => w.code)).toEqual([
        TAIL_SAMPLING_WARNING_CODES.RATE_LIMIT_PER_REPLICA,
      ]);
    });
  });

  it('finds a rate limit two levels down', () => {
    const warnings = getTailSamplingPolicyWarnings([
      {
        name: 'errors-unlimited',
        type: 'and',
        and: {
          and_sub_policy: [
            keepErrors,
            {
              name: 'not-limited',
              type: 'not',
              not: {
                not_sub_policy: {
                  name: 'limit',
                  type: 'rate_limiting',
                  rate_limiting: { spans_per_second: 100 },
                },
              },
            },
          ],
        },
      },
    ]);
    expect(warnings.map((w) => w.code)).toEqual([
      TAIL_SAMPLING_WARNING_CODES.RATE_LIMIT_PER_REPLICA,
    ]);
  });

  it('finds a span-kind condition in a not policy inside a drop policy', () => {
    const warnings = getTailSamplingPolicyWarnings([
      {
        name: 'drop-non-clients',
        type: 'drop',
        drop: {
          drop_sub_policy: [
            { name: 'not-client', type: 'not', not: { not_sub_policy: spanKindCondition } },
          ],
        },
      },
    ]);
    expect(warnings.map((w) => w.code)).toEqual([TAIL_SAMPLING_WARNING_CODES.EXIT_SPANS_DROPPED]);
  });

  it('reports the index of the policy that triggered each warning', () => {
    const warnings = getTailSamplingPolicyWarnings([
      keepErrors,
      { name: 'limit', type: 'rate_limiting', rate_limiting: { spans_per_second: 100 } },
    ]);
    expect(warnings.map((w) => w.policyIndex)).toEqual([1]);
  });
});
