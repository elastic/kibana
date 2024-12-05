/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import moment from 'moment';

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

const sortByRt = z.object({
  field: z.string(),
  direction: z.enum(['ASC', 'DESC']),
});

export type SortBy = z.TypeOf<typeof sortByRt>;

const searchCommonRt = z.object({
  start: z
    .optional(z.string())
    .default(() => moment().subtract(5, 'minutes').toISOString())
    .refine((val) => moment(val).isValid(), {
      message: '[start] should be a date in ISO format',
    }),
  end: z
    .optional(z.string())
    .default(() => moment().toISOString())
    .refine((val) => moment(val).isValid(), {
      message: '[end] should be a date in ISO format',
    }),
  sort: z.optional(sortByRt),
  limit: z.optional(z.number()).default(10),
  metadata_fields: z.optional(z.array(z.string())).default([]),
  filters: z.optional(z.array(z.string())).default([]),
});

export const searchByTypeRt = z.intersection(
  searchCommonRt,
  z.object({
    type: z.string(),
  })
);

export type SearchByType = z.output<typeof searchByTypeRt>;

export const searchBySourcesRt = z.intersection(
  searchCommonRt,
  z.object({
    sources: z.array(entitySourceDefinitionRt),
  })
);

export type SearchBySources = z.output<typeof searchBySourcesRt>;
