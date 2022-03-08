/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { isErrorWithReason } from './error_with_reason';

export function isAlertSavedObjectNotFoundError(err: Error, ruleId: string) {
  // if this is an error with a reason, the actual error needs to be extracted
  const actualError = isErrorWithReason(err) ? err.error : err;

  return SavedObjectsErrorHelpers.isNotFoundError(actualError) && `${actualError}`.includes(ruleId);
}

export function isEsUnavailableError(err: Error, ruleId: string) {
  // if this is an error with a reason, the actual error needs to be extracted
  const actualError = isErrorWithReason(err) ? err.error : err;
  return SavedObjectsErrorHelpers.isEsUnavailableError(actualError);
}
