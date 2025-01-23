/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { createIsNarrowSchema } from '../helpers';
import { streamDefinitionSchema } from './core';
import { groupedStreamDefinitionBaseSchema, groupedStreamDefinitionSchema } from './grouped';
import {
  ingestStreamDefinitionSchema,
  unwiredStreamDefinitionSchema,
  wiredStreamDefinitionSchema,
} from './ingest';

export const isIngestStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  ingestStreamDefinitionSchema
);

export const isWiredStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema
);

export const isUnwiredStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  unwiredStreamDefinitionSchema
);

export const isGroupedStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  groupedStreamDefinitionSchema
);

export const isGroupedStreamDefinitionBase = createIsNarrowSchema(
  z.unknown(),
  groupedStreamDefinitionBaseSchema
);

export const isRootStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema.refine((stream) => {
    return stream.name.split('.').length === 1;
  })
);
