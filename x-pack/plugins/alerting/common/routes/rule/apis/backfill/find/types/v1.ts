/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { findBackfillsRequestBodySchemaV1, findBackfillsResponseBodySchemaV1 } from '..';

export type FindBackfillsRequestBody = TypeOf<typeof findBackfillsRequestBodySchemaV1>;
export type FindBackfillsResponseBody = TypeOf<typeof findBackfillsResponseBodySchemaV1>;

export interface FindBackfillsResponse {
  body: FindBackfillsResponseBody;
}
