/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { getBackfillRequestParamsSchema, getBackfillResponseBodySchema } from './schemas/latest';
export type { GetBackfillRequestParams, GetBackfillResponseBody } from './types/latest';

export {
  getBackfillRequestParamsSchema as getBackfillRequestParamsSchemaV1,
  getBackfillResponseBodySchema as getBackfillResponseBodySchemaV1,
} from './schemas/v1';
export type {
  GetBackfillRequestParams as GetBackfillRequestParamsV1,
  GetBackfillResponseBody as GetBackfillResponseBodyV1,
  GetBackfillResponse as GetBackfillResponseV1,
} from './types/v1';
