/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isAlertSavedObjectNotFoundError } from './is_alert_not_found_error';
import { SavedObjectsErrorHelpers } from '../../../../../src/core/server';
import uuid from 'uuid';

describe('isAlertSavedObjectNotFoundError', () => {
  test('identifies SavedObjects Not Found errors', () => {
    const id = uuid.v4();
    // ensure the error created by SO parses as a string with the format we expect
    expect(
      `${SavedObjectsErrorHelpers.createGenericNotFoundError('alert', id)}`.includes(`alert/${id}`)
    ).toBe(true);

    const errorBySavedObjectsHelper = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'alert',
      id
    );

    expect(isAlertSavedObjectNotFoundError(errorBySavedObjectsHelper, id)).toBe(true);
  });

  test('identifies generic errors', () => {
    const id = uuid.v4();
    expect(isAlertSavedObjectNotFoundError(new Error(`not found`), id)).toBe(false);
  });
});
