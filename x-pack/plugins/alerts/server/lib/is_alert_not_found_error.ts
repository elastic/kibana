/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import { isErrorWithReason } from './error_with_reason';

export function isAlertSavedObjectNotFoundError(err: Error, alertId: string) {
  // if this is an error with a reason, the actual error needs to be extracted
  if (isErrorWithReason(err)) {
    err = err.error;
  }
  return SavedObjectsErrorHelpers.isNotFoundError(err) && `${err}`.includes(alertId);
}
