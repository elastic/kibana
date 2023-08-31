/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Latest
export type { ConnectorResponse, ActionTypeConfig } from './types/latest';
export { connectorResponseSchema } from './schemas/latest';
export { connectorTypesResponseSchema } from './schemas/latest';

// v1
export type {
  ConnectorResponse as ConnectorResponseV1,
  ActionTypeConfig as ActionTypeConfigV1,
} from './types/v1';
export { connectorResponseSchema as connectorResponseSchemaV1 } from './schemas/v1';
export type { ConnectorTypesResponse as ConnectorTypesResponseV1 } from './types/v1';
export { connectorTypesResponseSchema as connectorTypesResponseSchemaV1 } from './schemas/v1';
