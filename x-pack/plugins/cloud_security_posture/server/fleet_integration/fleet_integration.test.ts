/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import {
  RequestHandlerContext,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from '@kbn/core/server';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { CIS_KUBERNETES_PACKAGE_NAME } from '../../common/constants';
import { getPackagePolicyCreateCallback } from './fleet_integration';

describe('create CSP rules with post package create callback', () => {
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
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
    mockPackagePolicy.package!.name = CIS_KUBERNETES_PACKAGE_NAME;
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

    const handler = getPackagePolicyCreateCallback(logger);
    const mockContext = {
      core: { savedObjects: { client: mockSoClient } },
    } as unknown as RequestHandlerContext;
    const mockKibanaRequest = httpServerMock.createKibanaRequest();
    await handler(mockPackagePolicy, mockContext, mockKibanaRequest);

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

  it('should not create rules when the package policy is not csp package', async () => {
    const mockPackagePolicy = createPackagePolicyMock();
    mockPackagePolicy.package!.name = 'not_csp_package';
    const handler = getPackagePolicyCreateCallback(logger);
    const mockContext = {
      core: { savedObjects: { client: mockSoClient } },
    } as unknown as RequestHandlerContext;
    const mockKibanaRequest = httpServerMock.createKibanaRequest();
    const res = await handler(mockPackagePolicy, mockContext, mockKibanaRequest);
    expect(res).toEqual(mockPackagePolicy);
  });
});
