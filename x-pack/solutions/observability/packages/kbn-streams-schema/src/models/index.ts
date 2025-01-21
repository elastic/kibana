/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { IngestStreamDefinition, ingestStreamDefinitionSchema } from './ingest';
import { createIsNarrowSchema } from '../helpers';

export * from './ingest';
export * from './legacy';

export type StreamDefinition = IngestStreamDefinition;

export * from './api';

export const streamDefinitionSchema: z.Schema<StreamDefinition> = ingestStreamDefinitionSchema;

export const isStreamDefinition = createIsNarrowSchema(z.unknown(), streamDefinitionSchema);
