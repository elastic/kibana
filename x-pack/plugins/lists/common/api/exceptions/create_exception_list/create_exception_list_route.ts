/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  CreateExceptionListSchemaDecoded,
  ExceptionListSchema,
  createExceptionListSchema,
  exceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export { createExceptionListSchema as createExceptionListRequest };
export type { CreateExceptionListSchemaDecoded as CreateExceptionListRequestDecoded };

export const createExceptionListResponse = exceptionListSchema;
export type CreateExceptionListResponse = ExceptionListSchema;
