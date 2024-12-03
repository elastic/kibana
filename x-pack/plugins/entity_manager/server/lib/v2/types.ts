/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

// Definitions

export const entityTypeDefinitionRt = z.object({
  id: z.string(),
});

export type EntityTypeDefinition = z.TypeOf<typeof entityTypeDefinitionRt>;

export const entitySourceDefinitionRt = z.object({
  id: z.string(),
  type_id: z.string(),
  index_patterns: z.array(z.string()),
  identity_fields: z.array(z.string()),
  metadata_fields: z.array(z.string()),
  filters: z.array(z.string()),
  timestamp_field: z.optional(z.string()),
  display_name: z.optional(z.string()),
});

export type EntitySourceDefinition = z.TypeOf<typeof entitySourceDefinitionRt>;

// Stored definitions

export type DefinitionType = 'type' | 'source';

export interface BaseEntityDefinition {
  definition_type: DefinitionType;
  template_version: number;
}

export interface StoredEntityTypeDefinition extends BaseEntityDefinition {
  type: EntityTypeDefinition;
}

export interface StoredEntitySourceDefinition extends BaseEntityDefinition {
  source: EntitySourceDefinition;
}

// API parameters

export interface SortBy {
  field: string;
  direction: 'ASC' | 'DESC';
}
