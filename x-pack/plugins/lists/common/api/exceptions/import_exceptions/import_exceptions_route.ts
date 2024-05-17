/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { importExceptionsResponseSchema } from '@kbn/securitysolution-io-ts-list-types';
import { ImportQuerySchemaDecoded, importQuerySchema } from '@kbn/securitysolution-io-ts-types';

export {
  importQuerySchema as importExceptionsRequestQuery,
  importExceptionsResponseSchema as importExceptionsResponse,
};
export type { ImportQuerySchemaDecoded as ImportExceptionsRequestQueryDecoded };
