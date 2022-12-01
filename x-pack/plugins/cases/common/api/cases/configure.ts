/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

import { UserSchema } from '../user';
import { ConnectorMappingsSchema } from '../connectors';

const ClosureTypeSchema = z.enum(['close-by-user', 'close-by-push']);

const CasesConfigureBasicSchema = z
  .object({
    // TODO:
    /**
     * The external connector
     */
    connector: z.null(),
    /**
     * Whether to close the case after it has been synced with the external system
     */
    closure_type: ClosureTypeSchema,
    /**
     * The plugin owner that manages this configuration
     */
    owner: z.string(),
  })
  .strict();

export const CasesConfigureRequestSchema = CasesConfigureBasicSchema;

export const CasesConfigurePatchSchema = z
  .object({ version: z.string() })
  .merge(CasesConfigureBasicSchema.omit({ owner: true }).partial())
  .strict();

const CaseConfigureAttributesSchema = CasesConfigureBasicSchema.merge(
  z.object({
    created_at: z.string(),
    created_by: UserSchema,
    updated_at: z.nullable(z.string()),
    updated_by: z.nullable(UserSchema),
  })
).strict();

export const CaseConfigureResponseSchema = CaseConfigureAttributesSchema.merge(
  CaseConfigureAttributesSchema
)
  .merge(ConnectorMappingsSchema)
  .merge(
    z.object({
      id: z.string(),
      version: z.string(),
      error: z.nullable(z.string()),
      owner: z.string(),
    })
  )
  .strict();

export const GetConfigureFindRequestSchema = z
  .object({
    owner: z.union([z.array(z.string()), z.string()]),
  })
  .strict();

export const CaseConfigureRequestParamsSchema = z
  .object({
    configuration_id: z.string(),
  })
  .strict();

export const CaseConfigurationsResponseSchema = z.array(CaseConfigureResponseSchema);

export type ClosureType = z.infer<typeof ClosureTypeSchema>;
export type CasesConfigure = z.infer<typeof CasesConfigureBasicSchema>;
export type CasesConfigureRequest = z.infer<typeof CasesConfigureRequestSchema>;
export type CasesConfigurePatch = z.infer<typeof CasesConfigurePatchSchema>;
export type CasesConfigureAttributes = z.infer<typeof CaseConfigureAttributesSchema>;
export type CasesConfigureResponse = z.infer<typeof CaseConfigureResponseSchema>;
export type CasesConfigurationsResponse = z.infer<typeof CaseConfigurationsResponseSchema>;

export type GetConfigureFindRequest = z.infer<typeof GetConfigureFindRequestSchema>;
