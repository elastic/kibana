/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { isAdvancedVar } from './is_advanced_var';

describe('Ingest Manager - isAdvancedVar', () => {
  it('returns true for vars that should be show under advanced options', () => {
    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
        default: 'default string',
      })
    ).toBe(true);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        default: 'default string',
      })
    ).toBe(true);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
      })
    ).toBe(true);
  });

  it('returns false for vars that should be show by default', () => {
    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
        default: 'default string',
        show_user: true,
      })
    ).toBe(false);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        required: true,
      })
    ).toBe(false);

    expect(
      isAdvancedVar({
        name: 'mock_var',
        type: 'text',
        show_user: true,
      })
    ).toBe(false);
  });
});
