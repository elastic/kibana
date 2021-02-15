/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityFeatureUsageService } from './feature_usage_service';

describe('#setup', () => {
  it('registers all known security features', () => {
    const featureUsage = { register: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    securityFeatureUsage.setup({ featureUsage });
    expect(featureUsage.register).toHaveBeenCalledTimes(3);
    expect(featureUsage.register.mock.calls.map((c) => c[0])).toMatchInlineSnapshot(`
      Array [
        "Subfeature privileges",
        "Pre-access agreement",
        "Audit logging",
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
    expect(featureUsage.notifyUsage).toHaveBeenCalledWith('Subfeature privileges');
  });

  it('notifies when pre-access agreement is used', () => {
    const featureUsage = { notifyUsage: jest.fn(), getLastUsages: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    const startContract = securityFeatureUsage.start({ featureUsage });
    startContract.recordPreAccessAgreementUsage();
    expect(featureUsage.notifyUsage).toHaveBeenCalledTimes(1);
    expect(featureUsage.notifyUsage).toHaveBeenCalledWith('Pre-access agreement');
  });

  it('notifies when audit logging is used', () => {
    const featureUsage = { notifyUsage: jest.fn(), getLastUsages: jest.fn() };
    const securityFeatureUsage = new SecurityFeatureUsageService();
    const startContract = securityFeatureUsage.start({ featureUsage });
    startContract.recordAuditLoggingUsage();
    expect(featureUsage.notifyUsage).toHaveBeenCalledTimes(1);
    expect(featureUsage.notifyUsage).toHaveBeenCalledWith('Audit logging');
  });
});
