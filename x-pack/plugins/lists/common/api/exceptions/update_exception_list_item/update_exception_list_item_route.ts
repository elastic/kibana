/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  UpdateExceptionListItemSchemaDecoded,
  exceptionListItemSchema,
  updateExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export {
  updateExceptionListItemSchema as updateExceptionListItemRequest,
  exceptionListItemSchema as updateExceptionListItemResponse,
};
export type { UpdateExceptionListItemSchemaDecoded as UpdateExceptionListItemRequestDecoded };
