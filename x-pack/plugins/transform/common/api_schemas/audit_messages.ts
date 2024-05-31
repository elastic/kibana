/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

import type { TransformMessage } from '../types/messages';

export interface GetTransformsAuditMessagesResponseSchema {
  messages: TransformMessage[];
  total: number;
}

export const getTransformAuditMessagesQuerySchema = schema.object({
  sortField: schema.string(),
  sortDirection: schema.oneOf([schema.literal('asc'), schema.literal('desc')]),
});

export type GetTransformAuditMessagesQuerySchema = TypeOf<
  typeof getTransformAuditMessagesQuerySchema
>;
