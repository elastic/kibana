/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';

// Mirrors the policy configuration of the upstream `tail_sampling` processor (config.go).
// Every object is strict. The collector rejects an unknown key inside a policy block.
// On the policy itself it would read one as extension config, which Kibana does not support.

const nonEmptyString = lazySchema(() => z.string().trim().min(1));
const nonNegativeInt = z.number().int().nonnegative();

export const statusCodeValues = ['OK', 'ERROR', 'UNSET'] as const;
export const ottlErrorModes = ['ignore', 'silent', 'propagate'] as const;

// Policies that test the trace directly and hold no other policy.
const leafPolicyBlocks = {
  always_sample: null,
  trace_flags: null,
  latency: lazySchema(() =>
    z
      .strictObject({
        threshold_ms: nonNegativeInt,
        upper_threshold_ms: nonNegativeInt.optional(),
      })
      .refine((v) => v.upper_threshold_ms === undefined || v.upper_threshold_ms > v.threshold_ms, {
        message: 'upper_threshold_ms must be greater than threshold_ms',
        path: ['upper_threshold_ms'],
      })
  ),
  numeric_attribute: lazySchema(() =>
    z
      .strictObject({
        key: nonEmptyString,
        min_value: z.number().int().optional(),
        max_value: z.number().int().optional(),
        invert_match: z.boolean().optional(),
      })
      .refine((v) => v.min_value !== undefined || v.max_value !== undefined, {
        message: 'Set min_value, max_value or both',
      })
  ),
  probabilistic: lazySchema(() =>
    z.strictObject({
      sampling_percentage: z.number().gt(0).max(100),
      hash_salt: z.string().optional(),
    })
  ),
  status_code: lazySchema(() =>
    z.strictObject({
      status_codes: z.array(z.enum(statusCodeValues)).min(1),
    })
  ),
  string_attribute: lazySchema(() =>
    z.strictObject({
      key: nonEmptyString,
      values: z.array(nonEmptyString).min(1),
      enabled_regex_matching: z.boolean().optional(),
      cache_max_size: nonNegativeInt.optional(),
      invert_match: z.boolean().optional(),
    })
  ),
  trace_state: lazySchema(() =>
    z.strictObject({
      key: nonEmptyString,
      values: z.array(nonEmptyString).min(1),
    })
  ),
  rate_limiting: lazySchema(() =>
    z.strictObject({
      spans_per_second: z.number().int().positive(),
      burst_capacity: z.number().int().positive().optional(),
    })
  ),
  bytes_limiting: lazySchema(() =>
    z.strictObject({
      bytes_per_second: z.number().int().positive(),
      burst_capacity: z.number().int().positive().optional(),
    })
  ),
  span_count: lazySchema(() =>
    z
      .strictObject({
        min_spans: nonNegativeInt.optional(),
        max_spans: nonNegativeInt.optional(),
      })
      .refine((v) => v.min_spans !== undefined || v.max_spans !== undefined, {
        message: 'Set min_spans, max_spans or both',
      })
  ),
  boolean_attribute: lazySchema(() =>
    z.strictObject({
      key: nonEmptyString,
      value: z.boolean(),
      invert_match: z.boolean().optional(),
    })
  ),
  ottl_condition: lazySchema(() =>
    z
      .strictObject({
        error_mode: z.enum(ottlErrorModes).optional(),
        span: z.array(nonEmptyString).optional(),
        spanevent: z.array(nonEmptyString).optional(),
      })
      .refine((v) => (v.span?.length ?? 0) + (v.spanevent?.length ?? 0) > 0, {
        message: 'Add at least one span or spanevent condition',
      })
  ),
} as const;

export type LeafPolicyType = keyof typeof leafPolicyBlocks;
export const leafPolicyTypes = Object.keys(leafPolicyBlocks) as LeafPolicyType[];

// Policies that hold other policies.
export const compositePolicyTypes = ['and', 'not', 'drop', 'composite'] as const;
export type CompositePolicyType = (typeof compositePolicyTypes)[number];

export type SupportedPolicyType = LeafPolicyType | CompositePolicyType;
export const supportedPolicyTypes: SupportedPolicyType[] = [
  ...leafPolicyTypes,
  ...compositePolicyTypes,
];

function policyObject(type: string, block: z.ZodType | null) {
  const base = { name: nonEmptyString, type: z.literal(type) };
  return block === null ? z.strictObject(base) : z.strictObject({ ...base, [type]: block });
}

function policyUnion(schemas: z.ZodType[]) {
  return z.discriminatedUnion('type', schemas as unknown as [z.ZodObject, ...z.ZodObject[]]);
}

const leafPolicySchemas = leafPolicyTypes.map((type) => policyObject(type, leafPolicyBlocks[type]));

// What each kind of sub-policy may be, as in the upstream config:
//   not_sub_policy:        a leaf
//   and_sub_policy:        a leaf or `not`
//   drop_sub_policy:       a leaf or `not`
//   composite_sub_policy:  a leaf or `and`
export const leafPolicySchema = policyUnion(leafPolicySchemas);

const notBlock = lazySchema(() => z.strictObject({ not_sub_policy: leafPolicySchema }));

const andSubPolicySchema = policyUnion([...leafPolicySchemas, policyObject('not', notBlock)]);
const andBlock = lazySchema(() =>
  z.strictObject({ and_sub_policy: z.array(andSubPolicySchema).min(1) })
);

const compositeSubPolicySchema = policyUnion([...leafPolicySchemas, policyObject('and', andBlock)]);

const compositePolicyBlocks: Record<CompositePolicyType, z.ZodType> = {
  and: andBlock,
  not: notBlock,
  drop: lazySchema(() => z.strictObject({ drop_sub_policy: z.array(andSubPolicySchema).min(1) })),
  composite: lazySchema(() =>
    z.strictObject({
      max_total_spans_per_second: z.number().int().positive(),
      policy_order: z.array(nonEmptyString).min(1),
      composite_sub_policy: z.array(compositeSubPolicySchema).min(1),
      rate_allocation: z
        .array(
          z.strictObject({ policy: nonEmptyString, percent: z.number().int().positive().max(100) })
        )
        .optional(),
    })
  ),
};

export function getPolicySchema(type: SupportedPolicyType): z.ZodType {
  if (type in compositePolicyBlocks) {
    const compositeType = type as CompositePolicyType;
    return policyObject(compositeType, compositePolicyBlocks[compositeType]);
  }
  const leafType = type as LeafPolicyType;
  return policyObject(leafType, leafPolicyBlocks[leafType]);
}

export function isSupportedPolicyType(type: unknown): type is SupportedPolicyType {
  return typeof type === 'string' && (supportedPolicyTypes as string[]).includes(type);
}
