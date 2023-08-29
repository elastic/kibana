/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { bulkDeleteRulesRequestParamsSchemaV1 } from '..';
import { Rule } from '../../../../../rule';

export interface BulkOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

export type BulkDeleteRulesRequestParams = TypeOf<typeof bulkDeleteRulesRequestParamsSchemaV1>;

export interface BulkDeleteRulesResponse {
  rules: Rule[];
  errors: BulkOperationError[];
  total: number;
  taskIdsFailedToBeDeleted: string[];
}
