/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IngestStreamDefinition, UnwiredStreamDefinition, WiredStreamDefinition } from '.';
import { ElasticsearchAsset } from './common';
import { unwiredStreamDefinitionSchemaBase, wiredStreamDefinitionSchemaBase } from './base';

interface IngestStreamGetResponseBase<TStreamDefinition extends IngestStreamDefinition> {
  dashboards: string[];
  elasticsearch_assets: ElasticsearchAsset[];
  stream: Omit<TStreamDefinition, 'name'>;
}

interface IngestStreamUpsertRequestBase<TStreamDefinition extends IngestStreamDefinition> {
  dashboards: string[];
  stream: Omit<TStreamDefinition, 'name'>;
}

type WiredStreamGetResponse = IngestStreamGetResponseBase<WiredStreamDefinition>;

type UnwiredStreamGetResponse = IngestStreamGetResponseBase<UnwiredStreamDefinition>;

type IngestStreamGetResponse = WiredStreamGetResponse | UnwiredStreamGetResponse;

type WiredStreamUpsertRequest = IngestStreamUpsertRequestBase<WiredStreamDefinition>;
type UnwiredStreamUpsertRequest = IngestStreamUpsertRequestBase<UnwiredStreamDefinition>;

const wiredStreamUpsertRequestSchema: z.Schema<WiredStreamUpsertRequest> = z.strictObject({
  stream: wiredStreamDefinitionSchemaBase,
  dashboards: z.array(z.string()),
});

const unwiredStreamUpsertRequestSchema: z.Schema<UnwiredStreamUpsertRequest> = z.strictObject({
  stream: unwiredStreamDefinitionSchemaBase,
  dashboards: z.array(z.string()),
});

const ingestStreamUpsertRequestSchema: z.Schema<IngestStreamUpsertRequest> = z.union([
  wiredStreamUpsertRequestSchema,
  unwiredStreamUpsertRequestSchema,
]);

type IngestStreamUpsertRequest = WiredStreamUpsertRequest | UnwiredStreamUpsertRequest;

export {
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
  ingestStreamUpsertRequestSchema,
  type WiredStreamGetResponse,
  type WiredStreamUpsertRequest,
  wiredStreamUpsertRequestSchema,
  type UnwiredStreamGetResponse,
  type UnwiredStreamUpsertRequest,
  unwiredStreamUpsertRequestSchema,
};
