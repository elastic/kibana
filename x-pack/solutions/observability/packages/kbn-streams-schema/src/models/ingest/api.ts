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
import {
  ElasticsearchAsset,
  IngestStreamLifecycle,
  elasticsearchAssetSchema,
  ingestStreamLifecycleSchema,
} from './common';
import { createIsNarrowSchema, createAsSchemaOrThrow } from '../../helpers';

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
interface IngestStreamGetResponseBase extends StreamGetResponseBase {
  lifecycle: IngestStreamLifecycle;
}

interface WiredStreamGetResponse extends IngestStreamGetResponseBase {
  stream: Omit<WiredStreamDefinition, 'name'>;
  inherited_fields: InheritedFieldDefinition;
}

interface UnwiredStreamGetResponse extends IngestStreamGetResponseBase {
  stream: Omit<UnwiredStreamDefinition, 'name'>;
  elasticsearch_assets: ElasticsearchAsset[];
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

const ingestStreamGetResponseSchemaBase: z.Schema<IngestStreamGetResponseBase> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    lifecycle: ingestStreamLifecycleSchema,
  })
);

const wiredStreamGetResponseSchema: z.Schema<WiredStreamGetResponse> = z.intersection(
  ingestStreamGetResponseSchemaBase,
  z.object({
    stream: wiredStreamDefinitionSchemaBase,
    inherited_fields: inheritedFieldDefinitionSchema,
  })
);

const unwiredStreamGetResponseSchema: z.Schema<UnwiredStreamGetResponse> = z.intersection(
  ingestStreamGetResponseSchemaBase,
  z.object({
    stream: unwiredStreamDefinitionSchemaBase,
    elasticsearch_assets: z.array(elasticsearchAssetSchema),
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
  wiredStreamGetResponseSchema
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
