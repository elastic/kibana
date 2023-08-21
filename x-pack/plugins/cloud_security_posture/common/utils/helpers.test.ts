/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import {
  getBenchmarkFromPackagePolicy,
  getBenchmarkTypeFilter,
  cleanupCredentials,
} from './helpers';

describe('test helper methods', () => {
  it('get default integration type from inputs with multiple enabled types', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Both enabled falls back to default
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_k8s', enabled: true, streams: [] },
      { type: 'cloudbeat/cis_eks', enabled: true, streams: [] },
    ];
    const type = getBenchmarkFromPackagePolicy(mockPackagePolicy.inputs);
    expect(type).toMatch('cis_k8s');
  });

  it('get default integration type from inputs without any enabled types', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // None enabled falls back to default
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_k8s', enabled: false, streams: [] },
      { type: 'cloudbeat/cis_eks', enabled: false, streams: [] },
    ];
    const type = getBenchmarkFromPackagePolicy(mockPackagePolicy.inputs);
    expect(type).toMatch('cis_k8s');
  });

  it('get EKS integration type', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Single EKS selected
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_eks', enabled: true, streams: [] },
      { type: 'cloudbeat/cis_k8s', enabled: false, streams: [] },
    ];
    const typeEks = getBenchmarkFromPackagePolicy(mockPackagePolicy.inputs);
    expect(typeEks).toMatch('cis_eks');
  });

  it('get Vanilla K8S integration type', () => {
    const mockPackagePolicy = createPackagePolicyMock();

    // Single k8s selected
    mockPackagePolicy.inputs = [
      { type: 'cloudbeat/cis_eks', enabled: false, streams: [] },
      { type: 'cloudbeat/cis_k8s', enabled: true, streams: [] },
    ];
    const typeK8s = getBenchmarkFromPackagePolicy(mockPackagePolicy.inputs);
    expect(typeK8s).toMatch('cis_k8s');
  });
  it('get benchmark type filter based on a benchmark id', () => {
    const typeFilter = getBenchmarkTypeFilter('cis_eks');
    expect(typeFilter).toMatch('csp-rule-template.attributes.metadata.benchmark.id: "cis_eks"');
  });

  describe('cleanupCredentials', () => {
    it('cleans unused aws credential methods, except role_arn when using assume_role', () => {
      const mockPackagePolicy = createPackagePolicyMock();
      mockPackagePolicy.inputs = [
        {
          type: 'cloudbeat/cis_eks',
          enabled: true,
          streams: [
            {
              id: 'findings',
              enabled: true,
              data_stream: {
                dataset: 'cloud_security_posture.findings',
                type: 'logs',
              },
              vars: {
                'aws.credentials.type': { value: 'assume_role' },
                access_key_id: { value: 'unused', type: 'text' },
                credential_profile_name: { value: 'unused', type: 'text' },
                role_arn: { value: 'inuse' },
                secret_access_key: { value: 'unused', type: 'text' },
                session_token: { value: 'unused', type: 'text' },
                shared_credential_file: { value: 'unused', type: 'text' },
              },
            },
          ],
        },
      ];

      const cleanedPackage = cleanupCredentials(mockPackagePolicy);
      expect(cleanedPackage.inputs[0].streams[0].vars).toEqual({
        'aws.credentials.type': { value: 'assume_role' },
        access_key_id: { value: undefined, type: 'text' },
        credential_profile_name: { value: undefined, type: 'text' },
        role_arn: { value: 'inuse' },
        secret_access_key: { value: undefined, type: 'text' },
        session_token: { value: undefined, type: 'text' },
        shared_credential_file: { value: undefined, type: 'text' },
      });
    });

    it('cleans unused aws credential methods, when using cloud formation', () => {
      const mockPackagePolicy = createPackagePolicyMock();
      mockPackagePolicy.inputs = [
        {
          type: 'cloudbeat/cis_eks',
          enabled: true,
          streams: [
            {
              id: 'findings',
              enabled: true,
              data_stream: {
                dataset: 'cloud_security_posture.findings',
                type: 'logs',
              },
              vars: {
                'aws.credentials.type': { value: 'cloud_formation' },
                access_key_id: { value: 'unused', type: 'text' },
                credential_profile_name: { value: 'unused', type: 'text' },
                role_arn: { value: 'unused' },
                secret_access_key: { value: 'unused', type: 'text' },
                session_token: { value: 'unused', type: 'text' },
                shared_credential_file: { value: 'unused', type: 'text' },
              },
            },
          ],
        },
      ];

      const cleanedPackage = cleanupCredentials(mockPackagePolicy);
      expect(cleanedPackage.inputs[0].streams[0].vars).toEqual({
        'aws.credentials.type': { value: 'cloud_formation' },
        access_key_id: { value: undefined, type: 'text' },
        credential_profile_name: { value: undefined, type: 'text' },
        role_arn: { value: undefined },
        secret_access_key: { value: undefined, type: 'text' },
        session_token: { value: undefined, type: 'text' },
        shared_credential_file: { value: undefined, type: 'text' },
      });
    });

    it('cleans unused aws credential methods, when using direct_access_keys method ', () => {
      const mockPackagePolicy = createPackagePolicyMock();
      mockPackagePolicy.inputs = [
        {
          type: 'cloudbeat/cis_eks',
          enabled: true,
          streams: [
            {
              id: 'findings',
              enabled: true,
              data_stream: {
                dataset: 'cloud_security_posture.findings',
                type: 'logs',
              },
              vars: {
                'aws.credentials.type': { value: 'direct_access_keys' },
                access_key_id: { value: 'used', type: 'text' },
                credential_profile_name: { value: 'unused', type: 'text' },
                role_arn: { value: 'unused' },
                secret_access_key: { value: 'used', type: 'text' },
                session_token: { value: 'unused', type: 'text' },
                shared_credential_file: { value: 'unused', type: 'text' },
              },
            },
          ],
        },
      ];

      const cleanedPackage = cleanupCredentials(mockPackagePolicy);
      expect(cleanedPackage.inputs[0].streams[0].vars).toEqual({
        'aws.credentials.type': { value: 'direct_access_keys' },
        access_key_id: { value: 'used', type: 'text' },
        credential_profile_name: { value: undefined, type: 'text' },
        role_arn: { value: undefined },
        secret_access_key: { value: 'used', type: 'text' },
        session_token: { value: undefined, type: 'text' },
        shared_credential_file: { value: undefined, type: 'text' },
      });
    });
  });
});
