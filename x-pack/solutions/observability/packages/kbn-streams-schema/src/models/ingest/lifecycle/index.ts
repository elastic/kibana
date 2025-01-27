/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '../../../helpers';

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

export interface IngestStreamLifecycleError {
  error: {
    message: string;
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

export type UnwiredIngestStreamEffectiveLifecycle =
  | IngestStreamLifecycle
  | IngestStreamLifecycleError;

const dslLifecycleSchema = z.object({
  dsl: z.object({ data_retention: z.optional(NonEmptyString) }),
});
const ilmLifecycleSchema = z.object({ ilm: z.object({ policy: NonEmptyString }) });
const inheritLifecycleSchema = z.object({ inherit: z.strictObject({}) });
const disabledLifecycleSchema = z.object({ disabled: z.strictObject({}) });
const errorLifecycleSchema = z.object({ error: z.strictObject({ message: NonEmptyString }) });

export const ingestStreamLifecycleSchema: z.Schema<IngestStreamLifecycle> = z.union([
  dslLifecycleSchema,
  ilmLifecycleSchema,
  inheritLifecycleSchema,
  disabledLifecycleSchema,
]);

export const unwiredIngestStreamEffectiveLifecycleSchema: z.Schema<UnwiredIngestStreamEffectiveLifecycle> =
  z.union([ingestStreamLifecycleSchema, errorLifecycleSchema]);

export type InheritedIngestStreamLifecycle = IngestStreamLifecycle & { from: string };

export const inheritedIngestStreamLifecycleSchema: z.Schema<InheritedIngestStreamLifecycle> =
  ingestStreamLifecycleSchema.and(z.object({ from: NonEmptyString }));

export const isDslLifecycle = createIsNarrowSchema(
  unwiredIngestStreamEffectiveLifecycleSchema,
  dslLifecycleSchema
);

export const isIlmLifecycle = createIsNarrowSchema(
  unwiredIngestStreamEffectiveLifecycleSchema,
  ilmLifecycleSchema
);

export const isErrorLifecycle = createIsNarrowSchema(
  unwiredIngestStreamEffectiveLifecycleSchema,
  errorLifecycleSchema
);

export const isInheritLifecycle = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  inheritLifecycleSchema
);

export const isDisabledLifecycle = createIsNarrowSchema(
  ingestStreamLifecycleSchema,
  disabledLifecycleSchema
);
