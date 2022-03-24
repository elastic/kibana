/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema, TypeOf } from '@kbn/config-schema';

import type { ES_FIELD_TYPES } from '../../../../../src/plugins/data/common';

import type { Dictionary } from '../types/common';
import type { PivotAggDict } from '../types/pivot_aggs';
import type { PivotGroupByDict } from '../types/pivot_group_by';
import type { TransformId, TransformConfigUnion } from '../types/transform';

import { transformStateSchema, runtimeMappingsSchema } from './common';

// GET transform nodes
export interface GetTransformNodesResponseSchema {
  count: number;
}

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
  transforms: TransformConfigUnion[];
  errors?: Array<{ reason: string; type: string }>;
}

// schemas shared by parts of the preview, create and update endpoint
export const destSchema = schema.object({
  index: schema.string(),
  pipeline: schema.maybe(schema.string()),
});

export const pivotSchema = schema.object({
  group_by: schema.any(),
  aggregations: schema.any(),
  max_page_search_size: schema.maybe(schema.number()),
});

export const latestFunctionSchema = schema.object({
  unique_key: schema.arrayOf(schema.string()),
  sort: schema.string(),
});

export type PivotConfig = TypeOf<typeof pivotSchema>;

export type LatestFunctionConfig = TypeOf<typeof latestFunctionSchema>;

export const retentionPolicySchema = schema.object({
  time: schema.object({
    field: schema.string(),
    max_age: schema.string(),
  }),
});

export const settingsSchema = schema.object({
  max_page_search_size: schema.maybe(schema.number()),
  // The default value is null, which disables throttling.
  docs_per_second: schema.maybe(schema.nullable(schema.number())),
});

export const sourceSchema = schema.object({
  runtime_mappings: runtimeMappingsSchema,
  index: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  query: schema.maybe(schema.recordOf(schema.string(), schema.any())),
});

export const syncSchema = schema.object({
  time: schema.object({
    delay: schema.maybe(schema.string()),
    field: schema.string(),
  }),
});

function transformConfigPayloadValidator<
  T extends { pivot?: PivotConfig; latest?: LatestFunctionConfig }
>(value: T) {
  if (!value.pivot && !value.latest) {
    return 'pivot or latest is required for transform configuration';
  }
  if (value.pivot && value.latest) {
    return 'pivot and latest are not allowed together';
  }
}

export const _metaSchema = schema.object(
  {},
  {
    unknowns: 'allow',
  }
);

// PUT transforms/{transformId}
export const putTransformsRequestSchema = schema.object(
  {
    description: schema.maybe(schema.string()),
    dest: destSchema,
    frequency: schema.maybe(schema.string()),
    /**
     * Pivot and latest are mutually exclusive, i.e. exactly one must be specified in the transform configuration
     */
    pivot: schema.maybe(pivotSchema),
    /**
     * Latest and pivot are mutually exclusive, i.e. exactly one must be specified in the transform configuration
     */
    latest: schema.maybe(latestFunctionSchema),
    retention_policy: schema.maybe(retentionPolicySchema),
    settings: schema.maybe(settingsSchema),
    source: sourceSchema,
    sync: schema.maybe(syncSchema),
    /**
     * This _meta field stores an arbitrary key-value map
     * where keys are strings and values are arbitrary objects (possibly also maps).
     */
    _meta: schema.maybe(_metaSchema),
  },
  {
    validate: transformConfigPayloadValidator,
  }
);

export type PutTransformsRequestSchema = TypeOf<typeof putTransformsRequestSchema>;

export interface PutTransformsPivotRequestSchema
  extends Omit<PutTransformsRequestSchema, 'latest'> {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
}

export type PutTransformsLatestRequestSchema = Omit<PutTransformsRequestSchema, 'pivot'>;

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
export const postTransformsPreviewRequestSchema = schema.object(
  {
    pivot: schema.maybe(pivotSchema),
    latest: schema.maybe(latestFunctionSchema),
    source: sourceSchema,
  },
  {
    validate: transformConfigPayloadValidator,
  }
);

export type PostTransformsPreviewRequestSchema = TypeOf<typeof postTransformsPreviewRequestSchema>;

export type PivotTransformPreviewRequestSchema = Omit<
  PostTransformsPreviewRequestSchema,
  'latest'
> & {
  pivot: {
    group_by: PivotGroupByDict;
    aggregations: PivotAggDict;
  };
};

export type LatestTransformPreviewRequestSchema = Omit<PostTransformsPreviewRequestSchema, 'pivot'>;

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
