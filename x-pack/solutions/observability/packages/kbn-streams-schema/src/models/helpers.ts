/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsNarrowSchema } from '../helpers';
import { streamDefinitionSchema } from './core';
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

export const isRootStreamDefinition = createIsNarrowSchema(
  streamDefinitionSchema,
  wiredStreamDefinitionSchema.refine((stream) => {
    return stream.name.split('.').length === 1;
  })
);
