/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  areValidFeatures,
  getConnectorCompatibility,
  getConnectorFeatureName,
} from './connector_feature_config';

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

describe('getConnectorFeatureName', () => {
  it('returns the feature name for valid feature ids', () => {
    expect(getConnectorFeatureName('siem')).toEqual('Security Solution');
  });

  it('returns the id for invalid feature ids', () => {
    expect(getConnectorFeatureName('foo')).toEqual('foo');
  });
});

describe('getConnectorCompatibility', () => {
  it('returns the compatibility list for valid feature ids', () => {
    expect(getConnectorCompatibility(['alerting', 'cases', 'uptime', 'siem'])).toEqual([
      'Alerting Rules',
      'Cases',
    ]);
  });

  it('skips invalid feature ids', () => {
    expect(getConnectorCompatibility(['foo', 'bar', 'cases'])).toEqual(['Cases']);
  });
});
