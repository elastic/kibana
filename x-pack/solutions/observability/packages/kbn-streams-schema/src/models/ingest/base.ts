/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { StreamDefinitionBase } from '../base';
import { FieldDefinition, fieldDefinitionSchema } from './fields';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { RoutingDefinition, routingDefinitionSchema } from './routing';
import { IngestStreamLifecycle, ingestStreamLifecycleSchema } from './lifecycle';

interface IngestBase {
  lifecycle: IngestStreamLifecycle;
  processing: ProcessorDefinition[];
  routing: RoutingDefinition[];
}

interface WiredIngest extends IngestBase {
  wired: {
    fields: FieldDefinition;
  };
}

interface UnwiredIngest extends IngestBase {
  unwired: {};
}

interface WiredStreamDefinitionBase {
  ingest: WiredIngest;
}

interface UnwiredStreamDefinitionBase {
  ingest: UnwiredIngest;
}

interface WiredStreamDefinition extends StreamDefinitionBase {
  ingest: WiredIngest;
}

interface UnwiredStreamDefinition extends StreamDefinitionBase {
  ingest: UnwiredIngest;
}

type IngestStreamDefinition = WiredStreamDefinition | UnwiredStreamDefinition;

const ingestBaseSchema: z.Schema<IngestBase> = z.object({
  lifecycle: ingestStreamLifecycleSchema,
  processing: z.array(processorDefinitionSchema),
  routing: z.array(routingDefinitionSchema),
});

const unwiredIngestSchema: z.Schema<UnwiredIngest> = z.intersection(
  ingestBaseSchema,
  z.object({
    unwired: z.object({}),
  })
);

const wiredIngestSchema: z.Schema<WiredIngest> = z.intersection(
  ingestBaseSchema,
  z.object({
    wired: z.object({
      fields: fieldDefinitionSchema,
    }),
  })
);

const unwiredStreamDefinitionSchemaBase: z.Schema<UnwiredStreamDefinitionBase> = z.object({
  ingest: unwiredIngestSchema,
});

const wiredStreamDefinitionSchemaBase: z.Schema<WiredStreamDefinitionBase> = z.object({
  ingest: wiredIngestSchema,
});

const wiredStreamDefinitionSchema: z.Schema<WiredStreamDefinition> = z.intersection(
  z.object({
    name: NonEmptyString,
  }),
  wiredStreamDefinitionSchemaBase
);

const unwiredStreamDefinitionSchema: z.Schema<UnwiredStreamDefinition> = z.intersection(
  z.object({
    name: NonEmptyString,
  }),
  unwiredStreamDefinitionSchemaBase
);

const ingestStreamDefinitionSchema: z.Schema<IngestStreamDefinition> = z.union([
  wiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchema,
]);

const ingestStreamDefinitionSchemaBase: z.Schema<Omit<IngestStreamDefinition, 'name'>> = z.union([
  wiredStreamDefinitionSchemaBase,
  unwiredStreamDefinitionSchemaBase,
]);

export {
  type WiredStreamDefinition,
  wiredStreamDefinitionSchema,
  wiredStreamDefinitionSchemaBase,
  type UnwiredStreamDefinition,
  unwiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchemaBase,
  type IngestStreamDefinition,
  ingestStreamDefinitionSchema,
  ingestStreamDefinitionSchemaBase,
  type WiredIngest,
  wiredIngestSchema,
  type UnwiredIngest,
  unwiredIngestSchema,
};
