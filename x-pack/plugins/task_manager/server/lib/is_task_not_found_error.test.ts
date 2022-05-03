/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isTaskSavedObjectNotFoundError } from './is_task_not_found_error';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import uuid from 'uuid';

describe('isTaskSavedObjectNotFoundError', () => {
  test('identifies SavedObjects Not Found errors', () => {
    const id = uuid.v4();
    // ensure the error created by SO parses as a string with the format we expect
    expect(
      `${SavedObjectsErrorHelpers.createGenericNotFoundError('task', id)}`.includes(`task/${id}`)
    ).toBe(true);

    const errorBySavedObjectsHelper = SavedObjectsErrorHelpers.createGenericNotFoundError(
      'task',
      id
    );

    expect(isTaskSavedObjectNotFoundError(errorBySavedObjectsHelper, id)).toBe(true);
  });

  test('identifies generic errors', () => {
    const id = uuid.v4();
    expect(isTaskSavedObjectNotFoundError(new Error(`not found`), id)).toBe(false);
  });
});
