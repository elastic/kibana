/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { TypeOf } from '@kbn/config-schema';
import { RuleParamsV1, RuleResponseV1 } from '../../../response';
import { bulkEditRulesRequestBodySchemaV1 } from '..';

export type BulkEditRulesRequestBody = TypeOf<typeof bulkEditRulesRequestBodySchemaV1>;

interface BulkEditActionSkippedResult {
  id: RuleResponseV1['id'];
  name?: RuleResponseV1['name'];
  skip_reason: 'RULE_NOT_MODIFIED';
}

interface BulkEditOperationError {
  message: string;
  status?: number;
  rule: {
    id: string;
    name: string;
  };
}

export interface BulkEditRulesResponse<Params extends RuleParamsV1 = never> {
  body: {
    rules: Array<RuleResponseV1<Params>>;
    skipped: BulkEditActionSkippedResult[];
    errors: BulkEditOperationError[];
    total: number;
  };
}
