/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { has } from 'lodash';

export type RuleImportErrorType = 'conflict' | 'unknown';

/**
 * Generic interface representing a server-side failure during rule import.
 * Used by utilities that import rules or related entities.
 *
 * NOTE that this does not inherit from Error
 */
export interface RuleImportError {
  error: {
    ruleId: string;
    message: string;
    type: RuleImportErrorType;
  };
}

export const createRuleImportError = ({
  ruleId,
  message,
  type,
}: {
  ruleId: string;
  message: string;
  type?: RuleImportErrorType;
}): RuleImportError => ({
  error: {
    ruleId,
    message,
    type: type ?? 'unknown',
  },
});

export const isRuleImportError = (obj: unknown): obj is RuleImportError =>
  has(obj, 'error') &&
  has(obj, 'error.ruleId') &&
  has(obj, 'error.type') &&
  has(obj, 'error.message');

export const isRuleConflictError = (error: RuleImportError): boolean =>
  error.error.type === 'conflict';
