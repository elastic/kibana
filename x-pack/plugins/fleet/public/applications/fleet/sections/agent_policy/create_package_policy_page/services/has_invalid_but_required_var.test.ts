/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { hasInvalidButRequiredVar } from './has_invalid_but_required_var';

describe('Ingest Manager - hasInvalidButRequiredVar', () => {
  it('returns true for invalid & required vars', () => {
    expect(
      hasInvalidButRequiredVar(
        [
          {
            name: 'mock_var',
            type: 'text',
            required: true,
          },
        ],
        {}
      )
    ).toBe(true);

    expect(
      hasInvalidButRequiredVar(
        [
          {
            name: 'mock_var',
            type: 'text',
            required: true,
          },
        ],
        {
          mock_var: {
            value: undefined,
          },
        }
      )
    ).toBe(true);
  });

  it('returns false for valid & required vars', () => {
    expect(
      hasInvalidButRequiredVar(
        [
          {
            name: 'mock_var',
            type: 'text',
            required: true,
          },
        ],
        {
          mock_var: {
            value: 'foo',
          },
        }
      )
    ).toBe(false);
  });

  it('returns false for optional vars', () => {
    expect(
      hasInvalidButRequiredVar(
        [
          {
            name: 'mock_var',
            type: 'text',
          },
        ],
        {
          mock_var: {
            value: 'foo',
          },
        }
      )
    ).toBe(false);

    expect(
      hasInvalidButRequiredVar(
        [
          {
            name: 'mock_var',
            type: 'text',
            required: false,
          },
        ],
        {
          mock_var: {
            value: undefined,
          },
        }
      )
    ).toBe(false);
  });
});
