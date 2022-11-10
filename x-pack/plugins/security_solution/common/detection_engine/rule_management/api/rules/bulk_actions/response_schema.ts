/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
