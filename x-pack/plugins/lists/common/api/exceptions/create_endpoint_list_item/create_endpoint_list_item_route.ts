/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateEndpointListItemSchemaDecoded,
  ExceptionListItemSchema,
  createEndpointListItemSchema,
  exceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export { createEndpointListItemSchema as createEndpointListItemRequest };
export type { CreateEndpointListItemSchemaDecoded as CreateEndpointListItemRequestDecoded };

export const createEndpointListItemResponse = exceptionListItemSchema;
export type CreateEndpointListItemResponse = ExceptionListItemSchema;
