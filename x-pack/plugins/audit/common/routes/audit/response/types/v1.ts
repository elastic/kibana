/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';
import { findAuditResponseV1 } from '..';

type FindAuditResponseSchemaType = TypeOf<typeof findAuditResponseV1>;

export interface FindAuditResponse {
  page: FindAuditResponseSchemaType['page'];
  per_page: FindAuditResponseSchemaType['per_page'];
  total: FindAuditResponseSchemaType['total'];
  data: FindAuditResponseSchemaType['data'];
}
