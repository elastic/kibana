/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

// Mirrors the upstream `tail_sampling` processor policy configuration.
// The collector rejects unknown keys, so every block is strict.

const nonEmptyString = z.string().trim().min(1);
const nonNegativeInt = z.number().int().nonnegative();

export const statusCodeValues = ['OK', 'ERROR', 'UNSET'] as const;
export const ottlErrorModes = ['ignore', 'silent', 'propagate'] as const;

const leafPolicyBlocks = {
  always_sample: null,
  trace_flags: null,
  latency: z
    .object({
      threshold_ms: nonNegativeInt,
      upper_threshold_ms: nonNegativeInt.optional(),
    })
    .strict()
    .refine((v) => v.upper_threshold_ms === undefined || v.upper_threshold_ms > v.threshold_ms, {
      message: 'upper_threshold_ms must be greater than threshold_ms',
      path: ['upper_threshold_ms'],
    }),
  numeric_attribute: z
    .object({
      key: nonEmptyString,
      min_value: z.number().optional(),
      max_value: z.number().optional(),
      invert_match: z.boolean().optional(),
    })
    .strict()
    .refine((v) => v.min_value !== undefined || v.max_value !== undefined, {
      message: 'Set min_value, max_value or both',
    }),
  probabilistic: z
    .object({
      sampling_percentage: z.number().gt(0).max(100),
      hash_salt: z.string().optional(),
    })
    .strict(),
  status_code: z
    .object({
      status_codes: z.array(z.enum(statusCodeValues)).min(1),
    })
    .strict(),
  string_attribute: z
    .object({
      key: nonEmptyString,
      values: z.array(nonEmptyString).min(1),
      enabled_regex_matching: z.boolean().optional(),
      cache_max_size: nonNegativeInt.optional(),
      invert_match: z.boolean().optional(),
    })
    .strict(),
  trace_state: z
    .object({
      key: nonEmptyString,
      values: z.array(nonEmptyString).min(1),
    })
    .strict(),
  rate_limiting: z
    .object({
      spans_per_second: z.number().int().positive(),
      burst_capacity: z.number().int().positive().optional(),
    })
    .strict(),
  bytes_limiting: z
    .object({
      bytes_per_second: z.number().int().positive(),
      burst_capacity: z.number().int().positive().optional(),
    })
    .strict(),
  span_count: z
    .object({
      min_spans: nonNegativeInt,
      max_spans: nonNegativeInt.optional(),
    })
    .strict(),
  boolean_attribute: z
    .object({
      key: nonEmptyString,
      value: z.boolean(),
      invert_match: z.boolean().optional(),
    })
    .strict(),
  ottl_condition: z
    .object({
      error_mode: z.enum(ottlErrorModes).optional(),
      span: z.array(nonEmptyString).optional(),
      spanevent: z.array(nonEmptyString).optional(),
    })
    .strict()
    .refine((v) => (v.span?.length ?? 0) + (v.spanevent?.length ?? 0) > 0, {
      message: 'Add at least one span or spanevent condition',
    }),
} as const;

export type LeafPolicyType = keyof typeof leafPolicyBlocks;
export const leafPolicyTypes = Object.keys(leafPolicyBlocks) as LeafPolicyType[];

export const compositePolicyTypes = ['and', 'not', 'drop', 'composite'] as const;
export type CompositePolicyType = (typeof compositePolicyTypes)[number];

export type SupportedPolicyType = LeafPolicyType | CompositePolicyType;
export const supportedPolicyTypes: SupportedPolicyType[] = [
  ...leafPolicyTypes,
  ...compositePolicyTypes,
];
function policyObject(type: string, block: z.ZodType | null) {
  const base = { name: nonEmptyString, type: z.literal(type) };
  return (block === null ? z.object(base) : z.object({ ...base, [type]: block })).strict();
}

export const leafPolicySchema = z.discriminatedUnion(
  'type',
  leafPolicyTypes.map((type) => policyObject(type, leafPolicyBlocks[type])) as unknown as [
    z.ZodObject,
    ...z.ZodObject[]
  ]
);

const compositePolicyBlocks: Record<CompositePolicyType, z.ZodType> = {
  and: z.object({ and_sub_policy: z.array(leafPolicySchema).min(1) }).strict(),
  not: z.object({ not_sub_policy: leafPolicySchema }).strict(),
  drop: z.object({ drop_sub_policy: z.array(leafPolicySchema).min(1) }).strict(),
  composite: z
    .object({
      max_total_spans_per_second: z.number().int().positive(),
      policy_order: z.array(nonEmptyString).min(1),
      composite_sub_policy: z.array(leafPolicySchema).min(1),
      rate_allocation: z
        .array(z.object({ policy: nonEmptyString, percent: z.number().gt(0).max(100) }).strict())
        .optional(),
    })
    .strict(),
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
