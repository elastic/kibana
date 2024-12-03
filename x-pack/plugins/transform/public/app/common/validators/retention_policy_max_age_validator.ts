/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { retentionPolicyMaxAgeInvalidErrorMessage } from './messages';

import { parseDurationAboveZero } from './parse_duration_above_zero';
import { isRetentionPolicyMaxAge } from './is_retention_policy_max_age';
import type { Validator } from './types';

/**
 * Validates retention policy max age input.
 * Doesn't allow floating intervals.
 * @param value User input value. Minimum of 60s.
 */
export const retentionPolicyMaxAgeValidator: Validator = (arg) => {
  const parsedArg = parseDurationAboveZero(arg);

  if (Array.isArray(parsedArg)) {
    return parsedArg;
  }

  // We pass in again the original `arg`, not `parsedArg` since it will parse it again.
  return isRetentionPolicyMaxAge(arg) ? [] : [retentionPolicyMaxAgeInvalidErrorMessage];
};
