/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SupportedPolicyType } from './policy_schema';
import { validateTailSamplingPolicies } from './validate_policies';

const errors = { name: 'errors', type: 'status_code', status_code: { status_codes: ['ERROR'] } };

function policy(type: string, block: object | null, name = `test-${type}`) {
  return block === null ? { name, type } : { name, type, [type]: block };
}

// One valid block per policy type. The Record type fails to compile when a
// supported type has no example here.
const validBlocks: Record<SupportedPolicyType, object | null> = {
  always_sample: null,
  trace_flags: null,
  latency: { threshold_ms: 5000, upper_threshold_ms: 10000 },
  numeric_attribute: { key: 'http.response.status_code', min_value: 500 },
  probabilistic: { sampling_percentage: 0.1, hash_salt: 'custom-salt' },
  status_code: { status_codes: ['ERROR', 'UNSET'] },
  string_attribute: {
    key: 'url.path',
    values: ['/health', '/metrics'],
    enabled_regex_matching: true,
    cache_max_size: 10,
    invert_match: false,
  },
  trace_state: { key: 'vendor', values: ['a', 'b'] },
  rate_limiting: { spans_per_second: 35, burst_capacity: 70 },
  bytes_limiting: { bytes_per_second: 1024000, burst_capacity: 2048000 },
  span_count: { min_spans: 2, max_spans: 20 },
  boolean_attribute: { key: 'app.force_sample', value: true },
  ottl_condition: {
    error_mode: 'ignore',
    span: ['span.attributes["http.response.status_code"] >= 500'],
    spanevent: ['spanevent.name == "exception"'],
  },
  and: { and_sub_policy: [errors] },
  not: { not_sub_policy: errors },
  drop: { drop_sub_policy: [errors] },
  composite: {
    max_total_spans_per_second: 1000,
    policy_order: ['errors'],
    composite_sub_policy: [errors],
    rate_allocation: [{ policy: 'errors', percent: 50 }],
  },
};

// Invalid policies, with the path the diagnostic should point at.
const invalidPolicies: Array<[string, string, object | null, Array<string | number>]> = [
  ['latency without threshold_ms', 'latency', {}, ['latency', 'threshold_ms']],
  [
    'latency with an upper threshold below the threshold',
    'latency',
    { threshold_ms: 1000, upper_threshold_ms: 500 },
    ['latency', 'upper_threshold_ms'],
  ],
  ['latency without its block', 'latency', null, ['latency']],
  ['numeric_attribute without a bound', 'numeric_attribute', { key: 'k' }, ['numeric_attribute']],
  [
    'probabilistic at 0',
    'probabilistic',
    { sampling_percentage: 0 },
    ['probabilistic', 'sampling_percentage'],
  ],
  [
    'status_code with an unknown status',
    'status_code',
    { status_codes: ['FAILED'] },
    ['status_code', 'status_codes', 0],
  ],
  [
    'status_code with an empty list',
    'status_code',
    { status_codes: [] },
    ['status_code', 'status_codes'],
  ],
  [
    'string_attribute without a key',
    'string_attribute',
    { values: ['a'] },
    ['string_attribute', 'key'],
  ],
  [
    'string_attribute with no values',
    'string_attribute',
    { key: 'k', values: [] },
    ['string_attribute', 'values'],
  ],
  ['trace_state without values', 'trace_state', { key: 'k' }, ['trace_state', 'values']],
  [
    'rate_limiting at 0',
    'rate_limiting',
    { spans_per_second: 0 },
    ['rate_limiting', 'spans_per_second'],
  ],
  [
    'bytes_limiting with a decimal',
    'bytes_limiting',
    { bytes_per_second: 1.5 },
    ['bytes_limiting', 'bytes_per_second'],
  ],
  [
    'span_count with a negative minimum',
    'span_count',
    { min_spans: -1 },
    ['span_count', 'min_spans'],
  ],
  [
    'boolean_attribute with a string value',
    'boolean_attribute',
    { key: 'k', value: 'true' },
    ['boolean_attribute', 'value'],
  ],
  ['ottl_condition without conditions', 'ottl_condition', {}, ['ottl_condition']],
  [
    'ottl_condition with an unknown error mode',
    'ottl_condition',
    { error_mode: 'fail', span: ['true'] },
    ['ottl_condition', 'error_mode'],
  ],
  ['and without sub-policies', 'and', { and_sub_policy: [] }, ['and', 'and_sub_policy']],
  ['not without a sub-policy', 'not', {}, ['not', 'not_sub_policy']],
  ['drop without sub-policies', 'drop', { drop_sub_policy: [] }, ['drop', 'drop_sub_policy']],
  [
    'composite without a total rate',
    'composite',
    { policy_order: ['errors'], composite_sub_policy: [errors] },
    ['composite', 'max_total_spans_per_second'],
  ],
  [
    'composite with a rate allocation over 100',
    'composite',
    {
      max_total_spans_per_second: 1000,
      policy_order: ['errors'],
      composite_sub_policy: [errors],
      rate_allocation: [{ policy: 'errors', percent: 150 }],
    },
    ['composite', 'rate_allocation', 0, 'percent'],
  ],
];

// The policies of the upstream processor's own test config
// (processor/tailsamplingprocessor/testdata/tail_sampling_config.yaml).
// Kibana must accept everything in it.
const numericKey1 = { key: 'key1', min_value: 50, max_value: 100 };
const stringKey2 = { key: 'key2', values: ['value1', 'value2'] };
const upstreamTestConfigPolicies = [
  { name: 'test-policy-1', type: 'always_sample' },
  { name: 'test-policy-2', type: 'latency', latency: { threshold_ms: 5000 } },
  { name: 'test-policy-3', type: 'numeric_attribute', numeric_attribute: numericKey1 },
  {
    name: 'test-policy-4',
    type: 'probabilistic',
    probabilistic: { hash_salt: 'custom-salt', sampling_percentage: 0.1 },
  },
  { name: 'test-policy-5', type: 'status_code', status_code: { status_codes: ['ERROR', 'UNSET'] } },
  { name: 'test-policy-6', type: 'string_attribute', string_attribute: stringKey2 },
  {
    name: 'test-policy-7',
    type: 'rate_limiting',
    rate_limiting: { spans_per_second: 35, burst_capacity: 70 },
  },
  {
    name: 'test-policy-8',
    type: 'bytes_limiting',
    bytes_limiting: { bytes_per_second: 1024000, burst_capacity: 2048000 },
  },
  { name: 'test-policy-9', type: 'span_count', span_count: { min_spans: 2 } },
  {
    name: 'test-policy-10',
    type: 'trace_state',
    trace_state: { key: 'key3', values: ['value1', 'value2'] },
  },
  {
    name: 'test-policy-11',
    type: 'boolean_attribute',
    boolean_attribute: { key: 'key4', value: true },
  },
  {
    name: 'test-policy-12',
    type: 'ottl_condition',
    ottl_condition: {
      error_mode: 'ignore',
      span: [
        'attributes["test_attr_key_1"] == "test_attr_val_1"',
        'attributes["test_attr_key_2"] != "test_attr_val_1"',
      ],
      spanevent: [
        'name != "test_span_event_name"',
        'attributes["test_event_attr_key_2"] != "test_event_attr_val_1"',
      ],
    },
  },
  {
    name: 'and-policy-1',
    type: 'and',
    and: {
      and_sub_policy: [
        { name: 'test-and-policy-1', type: 'numeric_attribute', numeric_attribute: numericKey1 },
        { name: 'test-and-policy-2', type: 'string_attribute', string_attribute: stringKey2 },
        {
          name: 'test-and-policy-3',
          type: 'not',
          not: {
            not_sub_policy: {
              name: 'test-and-policy-3-not-sub-policy',
              type: 'latency',
              latency: { threshold_ms: 1000 },
            },
          },
        },
      ],
    },
  },
  {
    name: 'not-policy-1',
    type: 'not',
    not: {
      not_sub_policy: {
        name: 'test-not-policy-1',
        type: 'latency',
        latency: { threshold_ms: 1000 },
      },
    },
  },
  {
    name: 'composite-policy-1',
    type: 'composite',
    composite: {
      max_total_spans_per_second: 1000,
      policy_order: [
        'test-composite-policy-1',
        'test-composite-policy-2',
        'test-composite-policy-3',
      ],
      composite_sub_policy: [
        {
          name: 'test-composite-policy-1',
          type: 'numeric_attribute',
          numeric_attribute: numericKey1,
        },
        { name: 'test-composite-policy-2', type: 'string_attribute', string_attribute: stringKey2 },
        { name: 'test-composite-policy-3', type: 'always_sample' },
      ],
      rate_allocation: [
        { policy: 'test-composite-policy-1', percent: 50 },
        { policy: 'test-composite-policy-2', percent: 25 },
      ],
    },
  },
];

describe('tail-sampling policy schema', () => {
  describe('every supported policy type', () => {
    it.each(Object.entries(validBlocks))('accepts a valid %s policy', (type, block) => {
      expect(validateTailSamplingPolicies([policy(type, block)])).toEqual([]);
    });

    it.each(Object.entries(validBlocks))('rejects an unknown key on a %s policy', (type, block) => {
      const diagnostics = validateTailSamplingPolicies([{ ...policy(type, block), extra: true }]);
      expect(diagnostics.length).toBeGreaterThan(0);
      expect(diagnostics.every((d) => d.code === 'invalid_field' && d.policyIndex === 0)).toBe(
        true
      );
    });
  });

  describe('invalid policies', () => {
    it.each(invalidPolicies)('rejects %s', (_description, type, block, path) => {
      const diagnostics = validateTailSamplingPolicies([policy(type, block)]);
      expect(diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'invalid_field', policyIndex: 0, path }),
        ])
      );
    });

    it('rejects a policy with an empty name', () => {
      const diagnostics = validateTailSamplingPolicies([policy('always_sample', null, ' ')]);
      expect(diagnostics).toEqual([
        expect.objectContaining({ code: 'invalid_field', path: ['name'] }),
      ]);
    });

    it('rejects a block that belongs to another type', () => {
      const diagnostics = validateTailSamplingPolicies([
        {
          name: 'mismatch',
          type: 'boolean_attribute',
          string_attribute: { key: 'k', values: ['v'] },
        },
      ]);
      expect(diagnostics.length).toBeGreaterThan(0);
    });
  });

  it("accepts the upstream processor's test config", () => {
    expect(validateTailSamplingPolicies(upstreamTestConfigPolicies)).toEqual([]);
  });
});
