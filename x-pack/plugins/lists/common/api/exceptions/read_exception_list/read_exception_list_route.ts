/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ReadExceptionListSchemaDecoded,
  exceptionListSchema,
  readExceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export {
  readExceptionListSchema as readExceptionListRequestQuery,
  exceptionListSchema as readExceptionListResponse,
};
export type { ReadExceptionListSchemaDecoded as ReadExceptionListRequestQueryDecoded };
