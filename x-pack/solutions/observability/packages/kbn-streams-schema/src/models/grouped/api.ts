/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod';
import {
  StreamGetResponseBase,
  StreamUpsertRequestBase,
  streamUpsertRequestSchemaBase,
} from '../base/api';
import { GroupedStreamDefinitionBase, groupedStreamDefinitionBaseSchema } from './base';

/**
 * Grouped get response
 */
interface GroupedStreamGetResponse extends StreamGetResponseBase {
  stream: GroupedStreamDefinitionBase;
}

/**
 * Grouped upsert request
 */
interface GroupedStreamUpsertRequest extends StreamUpsertRequestBase {
  stream: GroupedStreamDefinitionBase;
}

const groupedStreamUpsertRequestSchema: z.Schema<GroupedStreamUpsertRequest> = z.intersection(
  streamUpsertRequestSchemaBase,
  z.object({
    stream: groupedStreamDefinitionBaseSchema,
  })
);

export {
  type GroupedStreamGetResponse,
  type GroupedStreamUpsertRequest,
  groupedStreamUpsertRequestSchema,
};
