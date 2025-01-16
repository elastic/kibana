/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Condition, conditionSchema } from '../conditions';
import { createIsSchema } from '../../../helpers';

export interface ProcessorBase {
  if: Condition;
}

interface GrokProcessorConfig extends ProcessorBase {
  field: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
  ignore_failure?: boolean;
  ignore_missing?: boolean;
}

export interface GrokProcessor {
  grok: GrokProcessorConfig;
}

const processorBaseSchema = z.strictObject({
  if: conditionSchema,
});

export const grokProcessorSchema: z.Schema<GrokProcessor> = z.object({
  grok: z.intersection(
    processorBaseSchema,
    z.object({
      field: z.string(),
      patterns: z.array(z.string()),
      pattern_definitions: z.optional(z.record(z.string())),
      ignore_failure: z.optional(z.boolean()),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
});

export interface DissectProcessorConfig extends ProcessorBase {
  field: string;
  pattern: string;
  append_separator?: string;
  ignore_failure?: boolean;
  ignore_missing?: boolean;
}

export interface DissectProcessor {
  dissect: DissectProcessorConfig;
}

export const dissectProcessorSchema: z.Schema<DissectProcessor> = z.object({
  dissect: z.intersection(
    processorBaseSchema,
    z.object({
      field: z.string(),
      pattern: z.string(),
      append_separator: z.optional(z.string()),
      ignore_failure: z.optional(z.boolean()),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
});

export type ProcessorDefinition = DissectProcessor | GrokProcessor;

type UnionKeysOf<T extends Record<string, any>> = T extends T ? keyof T : never;

export type ProcessorType = UnionKeysOf<ProcessorDefinition>;

export const processorDefinitionSchema: z.ZodType<ProcessorDefinition> = z.union([
  grokProcessorSchema,
  dissectProcessorSchema,
]);

export const isGrokProcessor = createIsSchema(grokProcessorSchema);
export const isDissectProcessor = createIsSchema(dissectProcessorSchema);
