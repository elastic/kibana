/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

const ActionTypeSchema = z.enum(['append', 'nothing', 'overwrite']);
const CaseFieldSchema = z.enum(['title', 'description', 'comments']);

const ThirdPartyFieldSchema = z.string();
export type ActionType = z.infer<typeof ActionTypeSchema>;
export type CaseField = z.infer<typeof CaseFieldSchema>;
export type ThirdPartyField = z.infer<typeof ThirdPartyFieldSchema>;

export const ConnectorMappingsAttributesSchema = z
  .object({
    action_type: ActionTypeSchema,
    source: CaseFieldSchema,
    // TODO: this used to be string | not_mapped, do we need that?
    target: z.string(),
  })
  .strict();

export const ConnectorMappingsSchema = z
  .object({
    mappings: z.array(ConnectorMappingsAttributesSchema),
    owner: z.string(),
  })
  .strict();

export type ConnectorMappingsAttributes = z.infer<typeof ConnectorMappingsAttributesSchema>;
export type ConnectorMappings = z.infer<typeof ConnectorMappingsSchema>;

const ConnectorFieldSchema = z.object({
  id: z.string(),
  name: z.string(),
  required: z.boolean(),
  type: z.enum(['text', 'textarea']),
});

export type ConnectorField = z.infer<typeof ConnectorFieldSchema>;

const GetDefaultMappingsResponseSchema = z.array(ConnectorMappingsAttributesSchema);

export type GetDefaultMappingsResponse = z.infer<typeof GetDefaultMappingsResponseSchema>;
