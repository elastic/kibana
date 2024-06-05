/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { getParamsSchema, getResponseSchema } from './schemas/latest';
export type {
  GetBackfillRequestParams,
  GetBackfillResponseBody,
  GetBackfillResponse,
} from './types/latest';

export {
  getParamsSchema as getParamsSchemaV1,
  getResponseSchema as getResponseSchemaV1,
} from './schemas/v1';
export type {
  GetBackfillRequestParams as GetBackfillRequestParamsV1,
  GetBackfillResponseBody as GetBackfillResponseBodyV1,
  GetBackfillResponse as GetBackfillResponseV1,
} from './types/v1';
