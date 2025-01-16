/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  IngestStreamDefinition,
  IngestStreamGetResponse,
  IngestStreamUpsertRequest,
  ingestStreamDefinitionSchema,
  ingestStreamUpsertRequestSchema,
} from './ingest';
import { createIsSchema } from '../helpers';

export * from './ingest';

export type StreamDefinition = IngestStreamDefinition;
export type StreamGetResponse = IngestStreamGetResponse;
export type StreamUpsertRequest = IngestStreamUpsertRequest;

export const streamDefinitionSchema: z.Schema<StreamDefinition> = ingestStreamDefinitionSchema;

export const isStreamDefinition = createIsSchema(streamDefinitionSchema);

export const streamUpsertRequestSchema: z.Schema<StreamUpsertRequest> =
  ingestStreamUpsertRequestSchema;
