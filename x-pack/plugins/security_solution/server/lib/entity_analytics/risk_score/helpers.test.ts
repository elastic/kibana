/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRiskScoreCalculationComplete } from './helpers';

describe('isRiskScoreCalculationComplete', () => {
  it('is true if both after_keys.host and after_keys.user are empty', () => {
    const result = {
      after_keys: {
        host: {},
        user: {},
      },
    };
    // @ts-expect-error using a minimal result object for testing
    expect(isRiskScoreCalculationComplete(result)).toEqual(true);
  });

  it('is true if after_keys is an empty object', () => {
    const result = {
      after_keys: {},
    };
    // @ts-expect-error using a minimal result object for testing
    expect(isRiskScoreCalculationComplete(result)).toEqual(true);
  });

  it('is false if the host key has a key/value', () => {
    const result = {
      after_keys: {
        host: {
          key: 'value',
        },
      },
    };
    // @ts-expect-error using a minimal result object for testing
    expect(isRiskScoreCalculationComplete(result)).toEqual(false);
  });

  it('is false if the user key has a key/value', () => {
    const result = {
      after_keys: {
        user: {
          key: 'value',
        },
      },
    };
    // @ts-expect-error using a minimal result object for testing
    expect(isRiskScoreCalculationComplete(result)).toEqual(false);
  });
});
