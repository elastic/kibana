/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DuplicateExceptionListQuerySchemaDecoded,
  duplicateExceptionListQuerySchema,
  exceptionListSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export {
  duplicateExceptionListQuerySchema as duplicateExceptionListRequestQuery,
  exceptionListSchema as duplicateExceptionListResponse,
};
export type { DuplicateExceptionListQuerySchemaDecoded as DuplicateExceptionListRequestQueryDecoded };
