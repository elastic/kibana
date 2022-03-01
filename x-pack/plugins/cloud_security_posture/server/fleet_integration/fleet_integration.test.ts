/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as fs from 'fs';
import { httpServerMock, loggingSystemMock } from 'src/core/server/mocks';
import {
  createPackagePolicyMock /* , deletePackagePolicyMock*/,
} from '../../../fleet/common/mocks';
import { xpackMocks } from '../../../fleet/server/mocks';
import {
  getPackagePolicyCreateCallback,
  //   getPackagePolicyDeleteCallback
} from './fleet_integration';
import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { NewPackagePolicy } from '../../../fleet/common/types/models';
// import { DeletePackagePoliciesResponse } from '../../../fleet/common';

let req: KibanaRequest;
let context: jest.Mocked<RequestHandlerContext>;
describe('csp_ingest_integration tests ', () => {
  beforeEach(() => {
    req = httpServerMock.createKibanaRequest();
    context = xpackMocks.createRequestHandlerContext();
  });

  describe('package policy create callback initialization tests', () => {
    const invokeCallback = async (): Promise<NewPackagePolicy> => {
      const logger = loggingSystemMock.create().get('csp_ingest_integration.test');
      const callback = getPackagePolicyCreateCallback(logger);

      return callback(createPackagePolicyMock(), context, req);
    };

    const TEST_POLICY_ID_1 = 'c6d16e42-c32d-4dce-8a88-113cfe276ad1';

    test('new csp-rules are created upon new package-policy installation', async () => {
      context.core.savedObjects.client.find = jest.fn().mockResolvedValue(CSP_RULE_TEMPLATES);
      context.core.savedObjects.client.bulkCreate = jest.fn().mockResolvedValue;

      expect((await invokeCallback(manifestManager)).inputs[0]).toStrictEqual(
        createNewEndpointPolicyInput({
          artifacts: {},
          manifest_version: '1.0.0',
          schema_version: 'v1',
        })
      );

      expect(manifestManager.buildNewManifest).toHaveBeenCalledWith();
      expect(manifestManager.pushArtifacts).not.toHaveBeenCalled();
      expect(manifestManager.commit).not.toHaveBeenCalled();
    });
  });
});

const CSP_RULE_TEMPLATES = {
  attributes: {
    benchmark_rule_id: '1.1.1',
    name: 'Ensure that the API server pod specification file permissions are set to 644 or more restrictive (Automated)',
    description: "'Disable anonymous requests to the API server",
    rationale:
      'When enabled, requests that are not rejected by other configured authentication methods\nare treated as anonymous requests. These requests are then served by the API server. You\nshould rely on authentication to authorize access and disallow anonymous requests.\nIf you are using RBAC authorization, it is generally considered reasonable to allow\nanonymous access to the API Server for health checks and discovery purposes, and hence\nthis recommendation is not scored. However, you should consider whether anonymous\ndiscovery is an acceptable risk for your purposes.',
    impact: 'Anonymous requests will be rejected.',
    default_value: 'By default, anonymous access is enabled.',
    remediation:
      'Edit the API server pod specification file /etc/kubernetes/manifests/kubeapiserver.yaml on the master node and set the below parameter.\n--anonymous-auth=false',
    enabled: true,
    muted: false,
    tags: ['Kubernetes', 'Containers'],
    benchmark: { name: 'CIS Kubernetes', version: '1.4.1' },
    severity: 'low',
  },
  id: 'sample_csp_rule_template',
  type: 'csp-rule-template',
};
