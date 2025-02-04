/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  StreamGetResponseBase,
  streamGetResponseSchemaBase,
  StreamUpsertRequestBase,
  streamUpsertRequestSchemaBase,
} from '../base/api';
import { GroupStreamDefinitionBase, groupStreamDefinitionBaseSchema } from './base';

/**
 * Group get response
 */
interface GroupStreamGetResponse extends StreamGetResponseBase {
  stream: GroupStreamDefinitionBase;
}

const groupStreamGetResponseSchema: z.Schema<GroupStreamGetResponse> = z.intersection(
  streamGetResponseSchemaBase,
  z.object({
    stream: groupStreamDefinitionBaseSchema,
  })
);

/**
 * Group upsert request
 */
interface GroupStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: GroupStreamDefinitionBase;
}

const groupStreamUpsertRequestSchema: z.Schema<GroupStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: groupStreamDefinitionBaseSchema,
  })
);

export {
  type GroupStreamGetResponse,
  type GroupStreamUpsertRequest,
  groupStreamGetResponseSchema,
  groupStreamUpsertRequestSchema,
};
