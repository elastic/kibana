/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import type { ElasticsearchClientMock } from '@kbn/core/server/mocks';
import {
  FLEET_ENDPOINT_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '@kbn/fleet-plugin/common';
import type { PackagePolicy } from '@kbn/fleet-plugin/common';
import type { PackagePolicyClient } from '@kbn/fleet-plugin/server';
import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import { policyFactory } from '@kbn/security-solution-plugin/common/endpoint/models/policy_config';

import { setEndpointPackagePolicyServerlessFlag } from './set_package_policy_flag';

describe('setEndpointPackagePolicyServerlessFlag', () => {
  let esClientMock: ElasticsearchClientMock;
  let soClientMock: jest.Mocked<SavedObjectsClientContract>;
  let packagePolicyServiceMock: jest.Mocked<PackagePolicyClient>;

  function generatePackagePolicy(policy = policyFactory()): PackagePolicy {
    return {
      inputs: [
        {
          config: {
            policy: {
              value: policy,
            },
          },
        },
      ],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any as PackagePolicy;
  }

  beforeEach(() => {
    esClientMock = elasticsearchServiceMock.createClusterClient().asInternalUser;
    soClientMock = savedObjectsClientMock.create();
    packagePolicyServiceMock = createPackagePolicyServiceMock();
  });

  it('updates serverless flag for endpoint policies', async () => {
    const packagePolicy1 = generatePackagePolicy();
    const packagePolicy2 = generatePackagePolicy();
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [packagePolicy1, packagePolicy2],
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      total: 2,
    });
    packagePolicyServiceMock.bulkCreate.mockImplementation();

    await setEndpointPackagePolicyServerlessFlag(
      soClientMock,
      esClientMock,
      packagePolicyServiceMock
    );

    const expectedPolicy1 = cloneDeep(packagePolicy1);
    expectedPolicy1!.inputs[0]!.config!.policy.value.meta.serverless = true;
    const expectedPolicy2 = cloneDeep(packagePolicy2);
    expectedPolicy2!.inputs[0]!.config!.policy.value.meta.serverless = true;
    const expectedPolicies = [expectedPolicy1, expectedPolicy2];
    expect(packagePolicyServiceMock.list).toBeCalledWith(soClientMock, {
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`,
    });
    expect(packagePolicyServiceMock.bulkUpdate).toBeCalledWith(
      soClientMock,
      esClientMock,
      expectedPolicies
    );
  });

  it('updates serverless flag for endpoint policies with the flag already set', async () => {
    const packagePolicy1 = generatePackagePolicy(
      policyFactory(undefined, undefined, undefined, undefined, undefined, true)
    );
    const packagePolicy2 = generatePackagePolicy(
      policyFactory(undefined, undefined, undefined, undefined, undefined, true)
    );
    packagePolicyServiceMock.list.mockResolvedValue({
      items: [packagePolicy1, packagePolicy2],
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      total: 2,
    });
    packagePolicyServiceMock.bulkCreate.mockImplementation();

    await setEndpointPackagePolicyServerlessFlag(
      soClientMock,
      esClientMock,
      packagePolicyServiceMock
    );

    expect(packagePolicyServiceMock.list).toBeCalledWith(soClientMock, {
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`,
    });
    expect(packagePolicyServiceMock.bulkUpdate).not.toBeCalled();
  });

  it('batches properly when over perPage', async () => {
    packagePolicyServiceMock.list
      .mockResolvedValueOnce({
        items: [],
        page: 1,
        perPage: SO_SEARCH_LIMIT,
        total: SO_SEARCH_LIMIT,
      })
      .mockResolvedValueOnce({
        items: [],
        page: 2,
        perPage: SO_SEARCH_LIMIT,
        total: 1,
      });
    packagePolicyServiceMock.bulkCreate.mockImplementation();

    await setEndpointPackagePolicyServerlessFlag(
      soClientMock,
      esClientMock,
      packagePolicyServiceMock
    );

    expect(packagePolicyServiceMock.list).toHaveBeenNthCalledWith(1, soClientMock, {
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`,
    });
    expect(packagePolicyServiceMock.list).toHaveBeenNthCalledWith(2, soClientMock, {
      page: 2,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_ENDPOINT_PACKAGE}`,
    });
  });
});
