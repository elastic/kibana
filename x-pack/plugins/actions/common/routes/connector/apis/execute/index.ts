/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  executeConnectorRequestParamsSchema,
  executeConnectorRequestBodySchema,
} from './schemas/latest';
export type { ExecuteConnectorRequestParams, ExecuteConnectorRequestBody } from './types/latest';

export {
  executeConnectorRequestParamsSchema as executeConnectorRequestParamsSchemaV1,
  executeConnectorRequestBodySchema as executeConnectorRequestBodySchemaV1,
} from './schemas/v1';
export type {
  ExecuteConnectorRequestParams as ExecuteConnectorRequestParamsV1,
  ExecuteConnectorRequestBody as ExecuteConnectorRequestBodyV1,
} from './types/v1';
