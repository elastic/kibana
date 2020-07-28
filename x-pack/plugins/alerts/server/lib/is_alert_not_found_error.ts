/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';

export function isAlertSavedObjectNotFoundError(err: Error, alertId: string) {
  return SavedObjectsErrorHelpers.isNotFoundError(err) && `${err}`.includes(alertId);
}
