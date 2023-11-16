/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { findBackfillsRequestBodySchema, findBackfillsResponseBodySchema } from './schemas/latest';
export type { FindBackfillsRequestBody, FindBackfillsResponseBody } from './types/latest';

export {
  findBackfillsRequestBodySchema as findBackfillsRequestBodySchemaV1,
  findBackfillsResponseBodySchema as findBackfillsResponseBodySchemaV1,
} from './schemas/v1';
export type {
  FindBackfillsRequestBody as FindBackfillsRequestBodyV1,
  FindBackfillsResponseBody as FindBackfillsResponseBodyV1,
  FindBackfillsResponse as FindBackfillsResponseV1,
} from './types/v1';
