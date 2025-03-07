/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import { investigationItemResponseSchema } from './investigation_item';

const attacheFileParamsSchema = z.object({
  body: z.object({
    fileName: z.string(),
    owner: z.string(),
    fileContent: z.string(), // TODO: change to stream
  }),
});

const attacheFileResponseSchema = investigationItemResponseSchema;

type AttachFileParams = z.infer<typeof attacheFileParamsSchema.shape.body>;
type AttacheFileResponse = z.output<typeof attacheFileResponseSchema>;

export { attacheFileParamsSchema, attacheFileResponseSchema };
export type { AttachFileParams, AttacheFileResponse };
