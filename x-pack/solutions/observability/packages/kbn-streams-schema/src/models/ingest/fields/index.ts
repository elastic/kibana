/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const FIELD_DEFINITION_TYPES = [
  'keyword',
  'match_only_text',
  'long',
  'double',
  'date',
  'boolean',
  'ip',
] as const;

export type FieldDefinitionType = (typeof FIELD_DEFINITION_TYPES)[number];

export interface FieldDefinition {
  type: FieldDefinitionType;
  format?: string;
}

export const fieldDefinitionSchema: z.Schema<FieldDefinition> = z.object({
  type: z.enum(FIELD_DEFINITION_TYPES),
  format: z.optional(z.string()),
});

export interface FieldDefinitionConfig {
  [x: string]: FieldDefinition;
}

export const fieldDefinitionConfigSchema: z.Schema<FieldDefinitionConfig> = z.record(
  z.string(),
  fieldDefinitionSchema
);

export interface InheritedFieldDefinition extends FieldDefinition {
  from: string;
}

export interface InheritedFields {
  [x: string]: InheritedFieldDefinition;
}

export const inheritedFieldsSchema: z.Schema<InheritedFields> = z.record(
  z.string(),
  z.intersection(fieldDefinitionSchema, z.object({ from: z.string() }))
);

export interface NamedFieldDefinition extends FieldDefinition {
  name: string;
}

export const namedFieldDefinitionSchema: z.Schema<NamedFieldDefinition> = z.intersection(
  fieldDefinitionSchema,
  z.object({
    name: z.string(),
  })
);
