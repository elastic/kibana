/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkOperationError } from '@kbn/alerting-plugin/server';
import type { BulkActionsDryRunErrCode } from '../../../../../constants';
import type { RuleAlertType } from '../../../../../../server/lib/detection_engine/rule_schema';
import type { PromisePoolError } from '../../../../../../server/utils/promise_pool';

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

export type BulkActionError =
  | PromisePoolError<string>
  | PromisePoolError<RuleAlertType>
  | BulkOperationError;

export enum BulkEditSkipReason {
  DataViewExistsAndNotOverriden = 'DataViewExistsAndNotOverriden',
  AddedIndexPatternAlreadyExists = 'AddedIndexPatternAlreadyExists',
  DeletedIndexPatternNonExistent = 'DeletedIndexPatternNonExistent',
  AddedTagAlreadyExists = 'AddedTagAlreadyExists',
  DeletedTagNonExistent = 'DeletedTagNonExistent',
}

export interface BulkActionSkipResult {
  id: RuleAlertType['id'];
  name?: RuleAlertType['name'];
  skip_reasons: BulkEditSkipReason[];
}

export interface BulkEditActionSummary {
  failed: number;
  skipped: number;
  succeeded: number;
  total: number;
}

export interface BulkEditActionResults {
  updated: RuleAlertType[];
  created: RuleAlertType[];
  deleted: RuleAlertType[];
  skipped: BulkActionSkipResult[];
}

export interface BulkEditActionResponse {
  success?: boolean;
  rules_count?: number;
  attributes: {
    results: BulkEditActionResults;
    summary: BulkEditActionSummary;
    errors?: NormalizedRuleError[];
  };
}
