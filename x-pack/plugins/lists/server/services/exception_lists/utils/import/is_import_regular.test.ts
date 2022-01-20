/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isImportRegular } from './is_import_regular';

describe('isImportRegular', () => {
  it('returns true if it has a status_code but no error', () => {
    expect(
      isImportRegular({
        list_id: '123',
        status_code: 200,
      })
    ).toBeTruthy();
  });

  it('returns false if it has error', () => {
    expect(
      isImportRegular({
        error: {
          message: 'error occurred',
          status_code: 500,
        },
        list_id: '123',
      })
    ).toBeFalsy();
  });
});
