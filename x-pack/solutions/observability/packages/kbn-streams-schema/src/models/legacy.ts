/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import {
  InheritedFieldDefinition,
  UnwiredIngestStreamEffectiveLifecycle,
  UnwiredStreamDefinition,
  WiredIngestStreamEffectiveLifecycle,
  WiredStreamDefinition,
  inheritedFieldDefinitionSchema,
  unwiredIngestStreamEffectiveLifecycleSchema,
  unwiredStreamDefinitionSchema,
  wiredIngestStreamEffectiveLifecycleSchema,
  wiredStreamDefinitionSchema,
} from './ingest';
import { ElasticsearchAsset, elasticsearchAssetSchema } from './ingest/common';
import { createIsNarrowSchema } from '../helpers';

/**
 * These are deprecated types, they should be migrated to the updated types
 */

interface ReadStreamDefinitionBase {
  name: string;
  dashboards: string[];
  elasticsearch_assets: ElasticsearchAsset[];
  inherited_fields: InheritedFieldDefinition;
}

interface WiredReadStreamDefinition extends ReadStreamDefinitionBase {
  stream: WiredStreamDefinition;
  effective_lifecycle: WiredIngestStreamEffectiveLifecycle;
}

interface UnwiredReadStreamDefinition extends ReadStreamDefinitionBase {
  stream: UnwiredStreamDefinition;
  data_stream_exists: boolean;
  effective_lifecycle: UnwiredIngestStreamEffectiveLifecycle;
}

type ReadStreamDefinition = WiredReadStreamDefinition | UnwiredReadStreamDefinition;

const readStreamDefinitionSchemaBase: z.Schema<ReadStreamDefinitionBase> = z.object({
  name: z.string(),
  dashboards: z.array(NonEmptyString),
  elasticsearch_assets: z.array(elasticsearchAssetSchema),
  inherited_fields: inheritedFieldDefinitionSchema,
});

const wiredReadStreamDefinitionSchema: z.Schema<WiredReadStreamDefinition> = z.intersection(
  readStreamDefinitionSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchema,
    effective_lifecycle: wiredIngestStreamEffectiveLifecycleSchema,
  })
);

const unwiredReadStreamDefinitionSchema: z.Schema<UnwiredReadStreamDefinition> = z.intersection(
  readStreamDefinitionSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchema,
    data_stream_exists: z.boolean(),
    effective_lifecycle: unwiredIngestStreamEffectiveLifecycleSchema,
  })
);

const readStreamSchema: z.Schema<ReadStreamDefinition> = z.union([
  wiredReadStreamDefinitionSchema,
  unwiredReadStreamDefinitionSchema,
]);

const isReadStream = createIsNarrowSchema(z.unknown(), readStreamSchema);
const isWiredReadStream = createIsNarrowSchema(readStreamSchema, wiredReadStreamDefinitionSchema);
const isUnwiredReadStream = createIsNarrowSchema(
  readStreamSchema,
  unwiredReadStreamDefinitionSchema
);

export {
  readStreamSchema,
  type ReadStreamDefinition,
  type WiredReadStreamDefinition,
  type UnwiredReadStreamDefinition,
  isReadStream,
  isWiredReadStream,
  isUnwiredReadStream,
  wiredReadStreamDefinitionSchema,
};
