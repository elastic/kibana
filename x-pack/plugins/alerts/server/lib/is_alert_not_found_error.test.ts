/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertSavedObjectNotFoundError } from './is_alert_not_found_error';
import { ErrorWithReason } from './error_with_reason';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import uuid from 'uuid';
import { AlertExecutionStatusErrorReasons } from '../types';

describe('isAlertSavedObjectNotFoundError', () => {
  const id = uuid.v4();
  const errorSONF = SavedObjectsErrorHelpers.createGenericNotFoundError('alert', id);

  test('identifies SavedObjects Not Found errors', () => {
    // ensure the error created by SO parses as a string with the format we expect
    expect(`${errorSONF}`.includes(`alert/${id}`)).toBe(true);

    expect(isAlertSavedObjectNotFoundError(errorSONF, id)).toBe(true);
  });

  test('identifies generic errors', () => {
    expect(isAlertSavedObjectNotFoundError(new Error(`not found`), id)).toBe(false);
  });

  test('identifies SavedObjects Not Found errors wrapped in an ErrorWithReason', () => {
    const error = new ErrorWithReason(AlertExecutionStatusErrorReasons.Read, errorSONF);
    expect(isAlertSavedObjectNotFoundError(error, id)).toBe(true);
  });
});
