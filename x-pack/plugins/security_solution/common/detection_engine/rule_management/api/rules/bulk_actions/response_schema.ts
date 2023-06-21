/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionSkipResult } from '@kbn/alerting-plugin/common';
import type { RuleResponse } from '../../../../rule_schema';
import type { BulkActionsDryRunErrCode } from '../../../../../constants';

export interface RuleDetailsInError {
  id: string;
  name?: string;
}
export interface NormalizedRuleError {
  message: string;
  status_code: number;
  err_code?: BulkActionsDryRunErrCode;
  rules: RuleDetailsInError[];
}
export interface BulkEditActionResults {
  updated: RuleResponse[];
  created: RuleResponse[];
  deleted: RuleResponse[];
  skipped: BulkActionSkipResult[];
}

export interface BulkEditActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}
export interface BulkEditActionSuccessResponse {
  success: boolean;
  rules_count: number;
  attributes: {
    results: BulkEditActionResults;
    summary: BulkEditActionSummary;
  };
}
export interface BulkEditActionErrorResponse {
  status_code: number;
  message: string;
  attributes: {
    results: BulkEditActionResults;
    summary: BulkEditActionSummary;
    errors?: NormalizedRuleError[];
  };
}

export type BulkEditActionResponse = BulkEditActionSuccessResponse | BulkEditActionErrorResponse;
