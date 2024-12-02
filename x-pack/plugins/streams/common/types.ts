/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export const binaryConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith']),
  value: stringOrNumberOrBoolean,
});

export const unaryFilterConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['exists', 'notExists']),
});

export const filterConditionSchema = z.discriminatedUnion('operator', [
  unaryFilterConditionSchema,
  binaryConditionSchema,
]);

export type FilterCondition = z.infer<typeof filterConditionSchema>;
export type BinaryFilterCondition = z.infer<typeof binaryConditionSchema>;
export type UnaryFilterCondition = z.infer<typeof unaryFilterConditionSchema>;

export interface AndCondition {
  and: Condition[];
}

export interface RerouteOrCondition {
  or: Condition[];
}

export type Condition = FilterCondition | AndCondition | RerouteOrCondition | undefined;

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    z.object({ and: z.array(conditionSchema) }),
    z.object({ or: z.array(conditionSchema) }),
  ])
);

export const grokProcessingDefinitionSchema = z.object({
  type: z.literal('grok'),
  field: z.string(),
  patterns: z.array(z.string()),
  pattern_definitions: z.optional(z.record(z.string())),
});

export const dissectProcessingDefinitionSchema = z.object({
  type: z.literal('dissect'),
  field: z.string(),
  pattern: z.string(),
});

export const processingDefinitionSchema = z.object({
  condition: z.optional(conditionSchema),
  config: z.discriminatedUnion('type', [
    grokProcessingDefinitionSchema,
    dissectProcessingDefinitionSchema,
  ]),
});

export type ProcessingDefinition = z.infer<typeof processingDefinitionSchema>;

export const fieldDefinitionSchema = z.object({
  name: z.string(),
  type: z.enum(['keyword', 'match_only_text', 'long', 'double', 'date', 'boolean', 'ip']),
});

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

export const streamWithoutIdDefinitonSchema = z.object({
  processing: z.array(processingDefinitionSchema).default([]),
  fields: z.array(fieldDefinitionSchema).default([]),
  children: z
    .array(
      z.object({
        id: z.string(),
        condition: z.optional(conditionSchema),
      })
    )
    .default([]),
});

export type StreamWithoutIdDefinition = z.infer<typeof streamDefinitonSchema>;

export const streamDefinitonSchema = streamWithoutIdDefinitonSchema.extend({
  id: z.string(),
});

export type StreamDefinition = z.infer<typeof streamDefinitonSchema>;

export const streamDefinitonWithoutChildrenSchema = streamDefinitonSchema.omit({ children: true });

export type StreamWithoutChildrenDefinition = z.infer<typeof streamDefinitonWithoutChildrenSchema>;
