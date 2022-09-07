/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  loggingSystemMock,
  savedObjectsClientMock,
  savedObjectsRepositoryMock,
} from '@kbn/core/server/mocks';
import {
  ISavedObjectsRepository,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { createPackagePolicyMock, deletePackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';
import {
  getBenchmarkInputType,
  onPackagePolicyPostCreateCallback,
  removeCspRulesInstancesCallback,
} from './fleet_integration';

describe('create CSP rules with post package create callback', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let savedObjectRepositoryMock: jest.Mocked<ISavedObjectsRepository>;
  const ruleAttributes = {
    id: '41308bcdaaf665761478bb6f0d745a5c',
    name: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive (Automated)',
    tags: ['CIS', 'Kubernetes', 'CIS 1.1.1', 'Master Node Configuration Files'],
    description:
      'Ensure that the API server pod specification file has permissions of `644` or more restrictive.\n',
    rationale:
      'The API server pod specification file controls various parameters that set the behavior of the API server. You should restrict its file permissions to maintain the integrity of the file. The file should be writable by only the administrators on the system.\n',
    default_value: 'By default, the `kube-apiserver.yaml` file has permissions of `640`.\n',
    impact: 'None\n',
    remediation:
      'Run the below command (based on the file location on your system) on the\nmaster node.\nFor example,\n```\nchmod 644 /etc/kubernetes/manifests/kube-apiserver.yaml\n```\n',
    benchmark: {
      name: 'CIS Kubernetes V1.20',
      version: 'v1.0.0',
      id: 'cis_k8s',
    },
    enabled: true,
    rego_rule_id: 'cis_1_2_2',
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    mockSoClient = savedObjectsClientMock.create();
  });
  it('should create stateful rules based on rule template', async () => {
    const mockPackagePolicy = createPackagePolicyMock();
    mockPackagePolicy.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
    mockSoClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'csp-rule-template',
          id: 'csp_rule_template-41308bcdaaf665761478bb6f0d745a5c',
          attributes: { ...ruleAttributes },
        },
      ],
      pit_id: undefined,
    } as unknown as SavedObjectsFindResponse);

    await onPackagePolicyPostCreateCallback(logger, mockPackagePolicy, mockSoClient);

    expect(mockSoClient.bulkCreate.mock.calls[0][0]).toMatchObject([
      {
        type: 'csp_rule',
        attributes: {
          ...ruleAttributes,
          package_policy_id: mockPackagePolicy.id,
          policy_id: mockPackagePolicy.policy_id,
        },
      },
    ]);
  });

  it('validate that all rules templates are fetched', async () => {
    const mockPackagePolicy = createPackagePolicyMock();
    mockPackagePolicy.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
    mockSoClient.find.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'csp-rule-template',
          id: 'csp_rule_template-41308bcdaaf665761478bb6f0d745a5c',
          attributes: { ...ruleAttributes },
        },
      ],
      pit_id: undefined,
    } as unknown as SavedObjectsFindResponse);
    await onPackagePolicyPostCreateCallback(logger, mockPackagePolicy, mockSoClient);

    expect(mockSoClient.find.mock.calls[0][0]).toMatchObject({ perPage: 10000 });
  });

  it('validate that all rules templates are deleted', async () => {
    savedObjectRepositoryMock = savedObjectsRepositoryMock.create();
    const mockDeletePackagePolicy = deletePackagePolicyMock();
    savedObjectRepositoryMock.find.mockResolvedValueOnce({
      saved_objects: [
        {
          type: 'csp-rule-template',
          id: 'csp_rule_template-41308bcdaaf665761478bb6f0d745a5c',
          attributes: { ...ruleAttributes },
        },
      ],
      pit_id: undefined,
    } as unknown as SavedObjectsFindResponse);
    await removeCspRulesInstancesCallback(
      mockDeletePackagePolicy[0],
      savedObjectRepositoryMock,
      logger
    );

    expect(savedObjectRepositoryMock.find.mock.calls[0][0]).toMatchObject({ perPage: 10000 });
  });

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
