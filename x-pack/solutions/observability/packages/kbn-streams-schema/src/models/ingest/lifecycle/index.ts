/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsNarrowSchema } from '@kbn/streams-schema/src/helpers';
import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';

export interface IngestStreamLifecycleDSL {
  dsl: {
    data_retention?: string;
  };
}

export interface IngestStreamLifecycleILM {
  ilm: {
    policy: string;
  };
}

export interface IngestStreamLifecycleInherit {
  inherit: {};
}

export interface IngestStreamLifecycleDisabled {
  disabled: {};
}

export type IngestStreamLifecycle =
  | IngestStreamLifecycleDSL
  | IngestStreamLifecycleILM
  | IngestStreamLifecycleInherit
  | IngestStreamLifecycleDisabled;

const dslLifecycleSchema = z.object({
  dsl: z.object({ data_retention: z.optional(NonEmptyString) }),
});
const ilmLifecycleSchema = z.object({ ilm: z.object({ policy: NonEmptyString }) });
const inheritLifecycleSchema = z.object({ inherit: z.strictObject({}) });
const disabledLifecycleSchema = z.object({ disabled: z.strictObject({}) });

export const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle> = z.union([
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
  disabledLifecycleSchema,
]);

export type InheritedIngestStreamLifecycle = IngestStreamLifecycle & { from: string };

export const inheritedIngestStreamLifecycleSchema: z.Schema<InheritedIngestStreamLifecycle> =
  ingestStreamLifecycleSchema.and(z.object({ from: NonEmptyString }));

export const isDslLifecycleSchema = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  dslLifecycleSchema
);

export const isIlmLifecycleSchema = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  ilmLifecycleSchema
);

export const isInheritLifecycleSchema = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  inheritLifecycleSchema
);

export const isDisabledLifecycleSchema = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  disabledLifecycleSchema
);
