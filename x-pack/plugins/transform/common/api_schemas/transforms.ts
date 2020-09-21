/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import type { ES_FIELD_TYPES } from '../../../../../src/plugins/data/common';

import type { Dictionary } from '../types/common';
import type { PivotAggDict } from '../types/pivot_aggs';
import type { PivotGroupByDict } from '../types/pivot_group_by';
import type { TransformId, TransformPivotConfig } from '../types/transform';

import { transformStateSchema } from './common';

// GET transforms
export const getTransformsRequestSchema = schema.arrayOf(
  schema.object({
    id: schema.string(),
    state: transformStateSchema,
  })
);

export type GetTransformsRequestSchema = TypeOf<typeof getTransformsRequestSchema>;

export interface GetTransformsResponseSchema {
  count: number;
  transforms: TransformPivotConfig[];
}

// schemas shared by parts of the preview, create and update endpoint
export const destSchema = schema.object({
  index: schema.string(),
  pipeline: schema.maybe(schema.string()),
});
export const pivotSchema = schema.object({
  group_by: schema.any(),
  aggregations: schema.any(),
});
export const settingsSchema = schema.object({
  max_page_search_size: schema.maybe(schema.number()),
  // The default value is null, which disables throttling.
  docs_per_second: schema.maybe(schema.nullable(schema.number())),
});
export const sourceSchema = schema.object({
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});
export const syncSchema = schema.object({
  time: schema.object({
    delay: schema.maybe(schema.string()),
    field: schema.string(),
  }),
});

// PUT transforms/{transformId}
export const putTransformsRequestSchema = schema.object({
  description: schema.maybe(schema.string()),
  dest: destSchema,
  frequency: schema.maybe(schema.string()),
  pivot: pivotSchema,
  settings: schema.maybe(settingsSchema),
  source: sourceSchema,
  sync: schema.maybe(syncSchema),
});

export interface PutTransformsRequestSchema extends TypeOf<typeof putTransformsRequestSchema> {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
}

interface TransformCreated {
  transform: TransformId;
}
interface TransformCreatedError {
  id: TransformId;
  error: any;
}
export interface PutTransformsResponseSchema {
  transformsCreated: TransformCreated[];
  errors: TransformCreatedError[];
}

// POST transforms/_preview
export const postTransformsPreviewRequestSchema = schema.object({
  pivot: pivotSchema,
  source: sourceSchema,
});

export interface PostTransformsPreviewRequestSchema
  extends TypeOf<typeof postTransformsPreviewRequestSchema> {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
}

interface EsMappingType {
  type: ES_FIELD_TYPES;
}

export type PreviewItem = Dictionary<any>;
export type PreviewData = PreviewItem[];
export type PreviewMappingsProperties = Dictionary<EsMappingType>;

export interface PostTransformsPreviewResponseSchema {
  generated_dest_index: {
    mappings: {
      _meta: {
        _transform: {
          transform: string;
          version: { create: string };
          creation_date_in_millis: number;
        };
        created_by: string;
      };
      properties: PreviewMappingsProperties;
    };
    settings: { index: { number_of_shards: string; auto_expand_replicas: string } };
    aliases: Record<string, any>;
  };
  preview: PreviewData;
}
