/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMaxPackageName, getPostureInputHiddenVars, getPosturePolicy } from './utils';
import { getMockPolicyAWS, getMockPolicyK8s, getMockPolicyEKS } from './mocks';

describe('getPosturePolicy', () => {
  for (const [name, getPolicy, expectedVars] of [
    ['cloudbeat/cis_aws', getMockPolicyAWS, { 'aws.credentials.type': { value: 'assume_role' } }],
    ['cloudbeat/cis_eks', getMockPolicyEKS, { 'aws.credentials.type': { value: 'assume_role' } }],
    ['cloudbeat/cis_k8s', getMockPolicyK8s, null],
  ] as const) {
    it(`updates package policy with hidden vars for ${name}`, () => {
      const inputVars = getPostureInputHiddenVars(name);
      const policy = getPosturePolicy(getPolicy(), name, inputVars);

      const enabledInputs = policy.inputs.filter(
        (i) => i.type === name && i.enabled && i.streams.some((s) => s.enabled)
      );

      expect(enabledInputs.length).toBe(1);
      if (expectedVars) expect(enabledInputs[0].streams[0].vars).toMatchObject({ ...expectedVars });
      else expect(enabledInputs[0].streams[0].vars).toBe(undefined);
    });
  }

  it('updates package policy required vars (posture/deployment)', () => {
    const mockCisAws = getMockPolicyAWS();
    expect(mockCisAws.vars?.posture.value).toBe('cspm');
    mockCisAws.vars!.extra = { value: 'value' };

    const policy = getPosturePolicy(mockCisAws, 'cloudbeat/cis_k8s');
    expect(policy.vars?.posture.value).toBe('kspm');
    expect(policy.vars?.deployment.value).toBe('self_managed');

    // Does not change extra vars
    expect(policy.vars?.extra.value).toBe('value');
  });

  it('updates package policy with a single enabled input', () => {
    const mockCisAws = getMockPolicyAWS();
    expect(mockCisAws.inputs.filter((i) => i.enabled).length).toBe(1);
    expect(mockCisAws.inputs.filter((i) => i.enabled)[0].type).toBe('cloudbeat/cis_aws');

    // enable all inputs of a policy
    mockCisAws.inputs = mockCisAws.inputs.map((i) => ({
      ...i,
      enabled: true,
      streams: i.streams.map((s) => ({ ...s, enabled: true })),
    }));

    // change input
    const policy = getPosturePolicy(mockCisAws, 'cloudbeat/cis_k8s');
    const enabledInputs = policy.inputs.filter(
      (i) => i.enabled && i.streams.some((s) => s.enabled)
    );

    expect(enabledInputs.length).toBe(1);
    expect(enabledInputs.map((v) => v.type)[0]).toBe('cloudbeat/cis_k8s');
  });
});

describe('getMaxPackageName', () => {
  it('should correctly increment cspm package name', () => {
    const packageName = 'cspm';
    const packagePolicies = [
      { name: 'kspm-1' },
      { name: 'kspm-2' },
      { name: 'cspm-3' },
      { name: 'vuln_mgmt-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('cspm-4');
  });

  it('should return correctly increment vuln_mgmt package name', () => {
    const packageName = 'vuln_mgmt';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
      { name: 'kspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('vuln_mgmt-4');
  });

  it('should return correctly increment kspm package name', () => {
    const packageName = 'kspm';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
      { name: 'kspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('kspm-2');
  });

  it('should return package name with -1 when no matching package policies are found', () => {
    const packageName = 'kspm';
    const packagePolicies = [
      { name: 'vuln_mgmt-1' },
      { name: 'vuln_mgmt-2' },
      { name: 'vuln_mgmt-3' },
      { name: 'cspm-1' },
    ];

    const result = getMaxPackageName(packageName, packagePolicies);

    expect(result).toBe('kspm-1');
  });
});
