/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  createConnectorRequestParamsSchema,
  createConnectorRequestBodySchema,
} from './schemas/latest';
export type { CreateConnectorRequestParams, CreateConnectorRequestBody } from './types/latest';

export {
  createConnectorRequestParamsSchema as createConnectorRequestParamsSchemaV1,
  createConnectorRequestBodySchema as createConnectorRequestBodySchemaV1,
} from './schemas/v1';
export type {
  CreateConnectorRequestParams as CreateConnectorRequestParamsV1,
  CreateConnectorRequestBody as CreateConnectorRequestBodyV1,
} from './types/v1';
