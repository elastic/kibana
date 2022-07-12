/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { areValidFeatures } from './connector_feature_config';

describe('areValidFeatures', () => {
  it('returns true when all inputs are valid features', () => {
    expect(areValidFeatures(['alerting', 'cases'])).toBeTruthy();
  });

  it('returns true when only one input and it is a valid feature', () => {
    expect(areValidFeatures(['alerting'])).toBeTruthy();
    expect(areValidFeatures(['cases'])).toBeTruthy();
  });

  it('returns false when one item in input is invalid', () => {
    expect(areValidFeatures(['alerting', 'nope'])).toBeFalsy();
  });

  it('returns false when all items in input are invalid', () => {
    expect(areValidFeatures(['alerts', 'nope'])).toBeFalsy();
  });
});
