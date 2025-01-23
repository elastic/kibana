/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  ingestStreamUpsertRequestSchema,
  type IngestStreamGetResponse,
  type IngestStreamUpsertRequest,
} from './ingest';
import {
  GroupedStreamGetResponse,
  GroupedStreamUpsertRequest,
  groupedStreamUpsertRequestSchema,
} from './grouped/api';

export const streamUpsertRequestSchema: z.Schema<StreamUpsertRequest> = z.union([
  ingestStreamUpsertRequestSchema,
  groupedStreamUpsertRequestSchema,
]);

export type StreamGetResponse = IngestStreamGetResponse | GroupedStreamGetResponse;
export type StreamUpsertRequest = IngestStreamUpsertRequest | GroupedStreamUpsertRequest;
