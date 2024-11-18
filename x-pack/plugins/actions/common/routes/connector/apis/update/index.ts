/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { updateConnectorParamsSchema, updateConnectorBodySchema } from './schemas/latest';
export type { UpdateConnectorBody, UpdateConnectorParams } from './types/latest';

export {
  updateConnectorParamsSchema as updateConnectorParamsSchemaV1,
  updateConnectorBodySchema as updateConnectorBodySchemaV1,
} from './schemas/v1';

export type {
  UpdateConnectorBody as UpdateConnectorBodyV1,
  UpdateConnectorParams as UpdateConnectorParamsV1,
} from './types/v1';
