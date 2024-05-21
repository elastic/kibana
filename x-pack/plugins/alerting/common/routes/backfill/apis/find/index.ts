/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { findQuerySchema, findResponseSchema } from './schemas/latest';
export type {
  FindBackfillRequestQuery,
  FindBackfillResponseBody,
  FindBackfillResponse,
} from './types/latest';

export {
  findQuerySchema as findQuerySchemaV1,
  findResponseSchema as findResponseSchemaV1,
} from './schemas/v1';
export type {
  FindBackfillRequestQuery as FindBackfillRequestQueryV1,
  FindBackfillResponseBody as FindBackfillResponseBodyV1,
  FindBackfillResponse as FindBackfillResponseV1,
} from './types/v1';
