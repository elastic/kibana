/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { getBenchmarkInputType } from './fleet_integration';

describe('create CSP rules with post package create callback', () => {
  it('get default integration type from inputs with multiple enabled types', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Both enabled falls back to default
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_k8s', enabled: true, streams: [] },
      { type: 'cloudbeat/cis_eks', enabled: true, streams: [] },
    ];
    const type = getBenchmarkInputType(mockPackagePolicy.inputs);
    expect(type).toMatch('cis_k8s');
  });

  it('get default integration type from inputs without any enabled types', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // None enabled falls back to default
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_k8s', enabled: false, streams: [] },
      { type: 'cloudbeat/cis_eks', enabled: false, streams: [] },
    ];
    const type = getBenchmarkInputType(mockPackagePolicy.inputs);
    expect(type).toMatch('cis_k8s');
  });

  it('get EKS integration type', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Single EKS selected
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_eks', enabled: true, streams: [] },
      { type: 'cloudbeat/cis_k8s', enabled: false, streams: [] },
    ];
    const typeEks = getBenchmarkInputType(mockPackagePolicy.inputs);
    expect(typeEks).toMatch('cis_eks');
  });

  it('get Vanilla K8S integration type', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Single k8s selected
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_eks', enabled: false, streams: [] },
      { type: 'cloudbeat/cis_k8s', enabled: true, streams: [] },
    ];
    const typeK8s = getBenchmarkInputType(mockPackagePolicy.inputs);
    expect(typeK8s).toMatch('cis_k8s');
  });
});
