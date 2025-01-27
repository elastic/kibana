/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  ingestStreamGetResponseSchema,
  ingestStreamUpsertRequestSchema,
  unwiredStreamGetResponseSchema,
  wiredStreamGetResponseSchema,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
} from './ingest';
import {
  GroupedStreamGetResponse,
  groupedStreamGetResponseSchema,
  GroupedStreamUpsertRequest,
  groupedStreamUpsertRequestSchema,
} from './grouped';
import { createAsSchemaOrThrow, createIsNarrowSchema } from '../helpers';

export const streamGetResponseSchema: z.Schema<StreamGetResponse> = z.union([
  ingestStreamGetResponseSchema,
  groupedStreamGetResponseSchema,
]);

export const streamUpsertRequestSchema: z.Schema<StreamUpsertRequest> = z.union([
  ingestStreamUpsertRequestSchema,
  groupedStreamUpsertRequestSchema,
]);

export const isWiredStreamGetResponse = createIsNarrowSchema(
  streamGetResponseSchema,
  wiredStreamGetResponseSchema
);

export const isUnWiredStreamGetResponse = createIsNarrowSchema(
  streamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

export const asWiredStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  wiredStreamGetResponseSchema
);

export const asUnwiredStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  unwiredStreamGetResponseSchema
);

export const asIngestStreamGetResponse = createAsSchemaOrThrow(
  streamGetResponseSchema,
  ingestStreamGetResponseSchema
);

export type StreamGetResponse = IngestStreamGetResponse | GroupedStreamGetResponse;
export type StreamUpsertRequest = IngestStreamUpsertRequest | GroupedStreamUpsertRequest;
