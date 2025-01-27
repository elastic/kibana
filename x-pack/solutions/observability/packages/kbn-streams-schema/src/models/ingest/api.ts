/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { InheritedFieldDefinition, inheritedFieldDefinitionSchema } from './fields';
import {
  StreamGetResponseBase,
  StreamUpsertRequestBase,
  streamGetResponseSchemaBase,
  streamUpsertRequestSchemaBase,
} from '../base/api';
import {
  UnwiredIngest,
  UnwiredStreamDefinition,
  WiredIngest,
  WiredStreamDefinition,
  unwiredIngestSchema,
  unwiredStreamDefinitionSchemaBase,
  wiredIngestSchema,
  wiredStreamDefinitionSchemaBase,
} from './base';
import { ElasticsearchAsset, elasticsearchAssetSchema } from './common';
import { createIsNarrowSchema, createAsSchemaOrThrow } from '../../helpers';
import {
  IngestStreamLifecycle,
  InheritedIngestStreamLifecycle,
  ingestStreamLifecycleSchema,
  inheritedIngestStreamLifecycleSchema,
} from './lifecycle';

/**
 * Ingest get response
 */

interface WiredIngestResponse {
  ingest: WiredIngest;
}

interface UnwiredIngestResponse {
  ingest: UnwiredIngest;
}

type IngestGetResponse = WiredIngestResponse | UnwiredIngestResponse;

interface WiredIngestUpsertRequest {
  ingest: WiredIngest;
}

interface UnwiredIngestUpsertRequest {
  ingest: UnwiredIngest;
}

type IngestUpsertRequest = WiredIngestUpsertRequest | UnwiredIngestUpsertRequest;

const wiredIngestUpsertRequestSchema: z.Schema<WiredIngestUpsertRequest> = z.object({
  ingest: wiredIngestSchema,
});

const unwiredIngestUpsertRequestSchema: z.Schema<UnwiredIngestUpsertRequest> = z.object({
  ingest: unwiredIngestSchema,
});

const ingestUpsertRequestSchema: z.Schema<IngestUpsertRequest> = z.union([
  wiredIngestUpsertRequestSchema,
  unwiredIngestUpsertRequestSchema,
]);

/**
 * Stream get response
 */
interface WiredStreamGetResponse extends StreamGetResponseBase {
  stream: Omit<WiredStreamDefinition, 'name'>;
  inherited_fields: InheritedFieldDefinition;
  effective_lifecycle: InheritedIngestStreamLifecycle;
}

interface UnwiredStreamGetResponse extends StreamGetResponseBase {
  stream: Omit<UnwiredStreamDefinition, 'name'>;
  elasticsearch_assets: ElasticsearchAsset[];
  effective_lifecycle: IngestStreamLifecycle;
}

type IngestStreamGetResponse = WiredStreamGetResponse | UnwiredStreamGetResponse;

/**
 * Ingest stream upsert request
 */

interface UnwiredStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: UnwiredIngestUpsertRequest;
}

interface WiredStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: WiredIngestUpsertRequest;
}

type IngestStreamUpsertRequest = WiredStreamUpsertRequest | UnwiredStreamUpsertRequest;

const unwiredStreamUpsertRequestSchema: z.Schema<UnwiredStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchemaBase,
  })
);

const wiredStreamUpsertRequestSchema: z.Schema<WiredStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchemaBase,
  })
);

const ingestStreamUpsertRequestSchema: z.Schema<IngestStreamUpsertRequest> = z.union([
  wiredStreamUpsertRequestSchema,
  unwiredStreamUpsertRequestSchema,
]);

const wiredStreamGetResponseSchema: z.Schema<WiredStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchemaBase,
    inherited_fields: inheritedFieldDefinitionSchema,
    effective_lifecycle: inheritedIngestStreamLifecycleSchema,
  })
);

const unwiredStreamGetResponseSchema: z.Schema<UnwiredStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchemaBase,
    elasticsearch_assets: z.array(elasticsearchAssetSchema),
    effective_lifecycle: ingestStreamLifecycleSchema,
  })
);

const ingestStreamGetResponseSchema: z.Schema<IngestStreamGetResponse> = z.union([
  wiredStreamGetResponseSchema,
  unwiredStreamGetResponseSchema,
]);

const isWiredStreamGetResponse = createIsNarrowSchema(
  ingestStreamGetResponseSchema,
  wiredStreamGetResponseSchema
);

const isUnWiredStreamGetResponse = createIsNarrowSchema(
  ingestStreamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

const asWiredStreamGetResponse = createAsSchemaOrThrow(
  ingestStreamGetResponseSchema,
  wiredStreamGetResponseSchema
);

const asUnwiredStreamGetResponse = createAsSchemaOrThrow(
  ingestStreamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

export {
  ingestStreamUpsertRequestSchema,
  ingestUpsertRequestSchema,
  isWiredStreamGetResponse,
  isUnWiredStreamGetResponse,
  asWiredStreamGetResponse,
  asUnwiredStreamGetResponse,
  type IngestGetResponse,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
  type IngestUpsertRequest,
  type UnwiredStreamGetResponse,
  type WiredStreamGetResponse,
  type UnwiredIngestUpsertRequest,
  type WiredIngestUpsertRequest,
};
