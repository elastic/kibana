/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ReadEndpointListItemSchemaDecoded,
  exceptionListItemSchema,
  readEndpointListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';

export {
  readEndpointListItemSchema as readEndpointListItemRequestQuery,
  exceptionListItemSchema as readEndpointListItemResponse,
};
export type { ReadEndpointListItemSchemaDecoded as ReadEndpointListItemRequestQueryDecoded };
