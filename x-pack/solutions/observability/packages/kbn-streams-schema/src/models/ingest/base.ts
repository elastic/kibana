/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { StreamDefinitionBase } from '../base';
import { FieldDefinitionConfig, fieldDefinitionSchema } from './fields';
import { ProcessorDefinition, processorDefinitionSchema } from './processors';
import { RoutingDefiniition, routingDefinitionSchema } from './routing';

interface IngestStreamDefinitionBase extends StreamDefinitionBase {
  ingest: {
    processors: ProcessorDefinition[];
    routing: RoutingDefiniition[];
  };
}

interface WiredStreamDefinition extends IngestStreamDefinitionBase {
  ingest: IngestStreamDefinitionBase['ingest'] & {
    wired: {
      fields: FieldDefinitionConfig;
    };
  };
}

interface UnwiredStreamDefinition extends IngestStreamDefinitionBase {
  ingest: IngestStreamDefinitionBase['ingest'] & {
    unwired: {};
  };
}

type IngestStreamDefinition = WiredStreamDefinition | UnwiredStreamDefinition;

const unwiredStreamDefinitionSchemaBase: z.Schema<Omit<UnwiredStreamDefinition, 'name'>> =
  z.strictObject({
    ingest: z.strictObject({
      processors: z.array(processorDefinitionSchema),
      routing: z.array(routingDefinitionSchema),
      unwired: z.strictObject({}),
    }),
  });

const wiredStreamDefinitionSchemaBase: z.Schema<Omit<WiredStreamDefinition, 'name'>> =
  z.strictObject({
    ingest: z.object({
      processors: z.array(processorDefinitionSchema),
      routing: z.array(routingDefinitionSchema),
      wired: z.strictObject({
        fields: z.record(fieldDefinitionSchema),
      }),
    }),
  });

const wiredStreamDefinitionSchema: z.Schema<WiredStreamDefinition> = z.intersection(
  z.strictObject({
    name: z.string(),
  }),
  wiredStreamDefinitionSchemaBase
);

const unwiredStreamDefinitionSchema: z.Schema<UnwiredStreamDefinition> = z.intersection(
  z.strictObject({
    name: z.string(),
  }),
  unwiredStreamDefinitionSchemaBase
);

const ingestStreamDefinitionSchema: z.Schema<IngestStreamDefinition> = z.union([
  wiredStreamDefinitionSchema,
  unwiredStreamDefinitionSchema,
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
};
