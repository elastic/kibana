/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAlertSavedObjectNotFoundError, isEsUnavailableError } from './is_alerting_error';
import { ErrorWithReason } from './error_with_reason';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import uuid from 'uuid';
import { RuleExecutionStatusErrorReasons } from '../types';

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
    const error = new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, errorSONF);
    expect(isAlertSavedObjectNotFoundError(error, id)).toBe(true);
  });
});

describe('isEsUnavailableError', () => {
  const id = uuid.v4();
  const errorSONF = SavedObjectsErrorHelpers.createGenericNotFoundEsUnavailableError('alert', id);

  test('identifies es unavailable errors', () => {
    // ensure the error created by SO parses as a string with the format we expect
    expect(`${errorSONF}`.includes(`alert/${id}`)).toBe(true);

    expect(isEsUnavailableError(errorSONF, id)).toBe(true);
  });

  test('identifies generic errors', () => {
    expect(isEsUnavailableError(new Error(`not found`), id)).toBe(false);
  });

  test('identifies es unavailable errors wrapped in an ErrorWithReason', () => {
    const error = new ErrorWithReason(RuleExecutionStatusErrorReasons.Read, errorSONF);
    expect(isEsUnavailableError(error, id)).toBe(true);
  });
});
