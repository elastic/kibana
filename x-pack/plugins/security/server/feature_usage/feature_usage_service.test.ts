/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SecurityFeatureUsageService } from './feature_usage_service';

describe('#setup', () => {
  it('registers all known security features', () => {
    const featureUsage = { register: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    securityFeatureUsage.setup({ featureUsage });
    expect(featureUsage.register).toHaveBeenCalledTimes(2);
    expect(featureUsage.register.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "sub_feature_privileges",
        "pre_access_agreement",
      ]
    `);
  });
});

describe('start contract', () => {
  it('notifies when sub-feature privileges are in use', () => {
    const featureUsage = { notifyUsage: jest.fn(), getLastUsages: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    const startContract = securityFeatureUsage.start({ featureUsage });
    startContract.recordSubFeaturePrivilegeUsage();
    expect(featureUsage.notifyUsage).toHaveBeenCalledTimes(1);
    expect(featureUsage.notifyUsage).toHaveBeenCalledWith('sub_feature_privileges');
  });

  it('notifies when pre-access agreement is used', () => {
    const featureUsage = { notifyUsage: jest.fn(), getLastUsages: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    const startContract = securityFeatureUsage.start({ featureUsage });
    startContract.recordPreAccessAgreementUsage();
    expect(featureUsage.notifyUsage).toHaveBeenCalledTimes(1);
    expect(featureUsage.notifyUsage).toHaveBeenCalledWith('pre_access_agreement');
  });
});
