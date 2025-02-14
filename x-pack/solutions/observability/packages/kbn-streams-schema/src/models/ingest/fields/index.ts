/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

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

// We redefine "first class" parameters
export type FieldDefinitionConfig = MappingProperty & {
  type: FieldDefinitionType;
  format?: string;
};

// Parameters that we provide a generic (JSON blob) experience for
export type FieldDefinitionConfigAdvancedParameters = Omit<
  FieldDefinitionConfig,
  'type' | 'format'
>;

export const fieldDefinitionConfigSchema: z.Schema<FieldDefinitionConfig> = z.intersection(
  z.record(z.string(), z.unknown()),
  z.object({
    type: z.enum(FIELD_DEFINITION_TYPES),
    format: z.optional(NonEmptyString),
  })
);

export interface FieldDefinition {
  [x: string]: FieldDefinitionConfig;
}

export const fieldDefinitionSchema: z.Schema<FieldDefinition> = z.record(
  z.string(),
  fieldDefinitionConfigSchema
);

export type InheritedFieldDefinitionConfig = FieldDefinitionConfig & {
  from: string;
};

export interface InheritedFieldDefinition {
  [x: string]: InheritedFieldDefinitionConfig;
}

export const inheritedFieldDefinitionSchema: z.Schema<InheritedFieldDefinition> = z.record(
  z.string(),
  z.intersection(fieldDefinitionConfigSchema, z.object({ from: NonEmptyString }))
);

export type NamedFieldDefinitionConfig = FieldDefinitionConfig & {
  name: string;
};

export const namedFieldDefinitionConfigSchema: z.Schema<NamedFieldDefinitionConfig> =
  z.intersection(
    fieldDefinitionConfigSchema,
    z.object({
      name: NonEmptyString,
    })
  );
