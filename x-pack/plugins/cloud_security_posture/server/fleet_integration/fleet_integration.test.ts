/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, loggingSystemMock, savedObjectsClientMock } from 'src/core/server/mocks';
import type { SavedObjectsFindResponse } from 'src/core/server';
import { PackagePolicy } from '../../../fleet/common';
import { CIS_BENCHMARK_1_4_1_RULE_TEMPLATES } from '../assets/csp_rule_templates';

import {
  getPackagePolicyCreateCallback,
  getPackagePolicyDeleteCallback,
} from './fleet_integration';
import { KibanaRequest, RequestHandlerContext } from 'kibana/server';
import { NewPackagePolicy } from '../../../fleet/common/types/models';
import { DeletePackagePoliciesResponse } from '../../../fleet/common';

let mockedReq: KibanaRequest;
let mockedContext: RequestHandlerContext;
let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;

describe('fleet integration csp tests ', () => {
  beforeEach(() => {
    mockedReq = httpServerMock.createKibanaRequest();
    savedObjectsClient = savedObjectsClientMock.create();

    mockedContext = {
      core: {
        savedObjects: {
          client: savedObjectsClient,
        },
      },
    } as unknown as RequestHandlerContext;
  });

  describe('package policy create callback initialization tests', () => {
    const invokeCallback = async (): Promise<NewPackagePolicy> => {
      const logger = loggingSystemMock.create().get('csp_ingest_integration.test');
      const callback = getPackagePolicyCreateCallback(logger);

      return callback(createPackagePolicyMock(), mockedContext, mockedReq);
    };

    test('new csp-rules are created upon new package-policy installation', async () => {
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: CIS_BENCHMARK_1_4_1_RULE_TEMPLATES,
        total: CIS_BENCHMARK_1_4_1_RULE_TEMPLATES.length,
      } as SavedObjectsFindResponse);
      savedObjectsClient.bulkCreate = jest.fn().mockResolvedValue('');

      await invokeCallback();

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('package policy delete callback tests', () => {
    const invokeCallback = async (): Promise<void> => {
      const callback = getPackagePolicyDeleteCallback(savedObjectsClient as any);
      return callback(deletePackagePolicyMock());
    };

    test('new csp-rules are removed upon package-policy deletion', async () => {
      const numOfTemplates = CIS_BENCHMARK_1_4_1_RULE_TEMPLATES.length;
      savedObjectsClient.find.mockResolvedValue({
        saved_objects: CIS_BENCHMARK_1_4_1_RULE_TEMPLATES,
        total: numOfTemplates,
      } as SavedObjectsFindResponse);
      savedObjectsClient.delete = jest.fn().mockResolvedValue('');

      await invokeCallback();

      expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
      expect(savedObjectsClient.delete).toHaveBeenCalledTimes(numOfTemplates);
    });
  });
});

const createNewPackagePolicyMock = (): NewPackagePolicy => {
  return {
    name: 'cis kubernetes benchmark - 1',
    description: '',
    namespace: 'default',
    enabled: true,
    policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
    output_id: '',
    package: {
      name: 'cis_kubernetes_benchmark',
      title: 'cis_kubernetes_benchmark',
      version: '0.0.1',
    },
    inputs: [],
  };
};

const createPackagePolicyMock = (): PackagePolicy => {
  const newPackagePolicy = createNewPackagePolicyMock();
  return {
    ...newPackagePolicy,
    id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
    version: 'abcd',
    revision: 1,
    updated_at: '2020-06-25T16:03:38.159292',
    updated_by: 'kibana',
    created_at: '2020-06-25T16:03:38.159292',
    created_by: 'kibana',
    inputs: [
      {
        config: {},
        enabled: true,
        type: 'cis kubernetes benchmark',
        streams: [],
      },
    ],
  };
};

const deletePackagePolicyMock = (): DeletePackagePoliciesResponse => {
  const newPackagePolicy = createNewPackagePolicyMock();
  return [
    {
      id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
      success: true,
      package: newPackagePolicy.package,
    },
  ];
};
