/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ErrorThatHandlesItsOwnResponse, ElasticsearchError } from './types';
import { getEsErrorMessage } from './es_error_parser';

export function isErrorThatHandlesItsOwnResponse(
  e: ErrorThatHandlesItsOwnResponse
): e is ErrorThatHandlesItsOwnResponse {
  return typeof (e as ErrorThatHandlesItsOwnResponse).sendResponse === 'function';
}

export type { ErrorThatHandlesItsOwnResponse, ElasticsearchError };
export { getEsErrorMessage };
export type { RuleTypeDisabledReason } from './rule_type_disabled';
export { RuleTypeDisabledError } from './rule_type_disabled';
export { RuleMutedError } from './rule_muted';
