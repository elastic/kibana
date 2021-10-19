/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from 'kibana/server';
import { savedObjectsClientMock } from '../../../../../../../../src/core/server/mocks';
import { createPackagePolicyServiceMock } from '../../../../../../fleet/server/mocks';
import { PackagePolicy } from '../../../../../../fleet/common/types/models';
import { PackagePolicyServiceInterface } from '../../../../../../fleet/server';
import { getAllEndpointPackagePolicies } from './endpoint_package_policies';

describe('endpoint_package_policies', () => {
  describe('getAllEndpointPackagePolicies', () => {
    let mockSavedObjectClient: jest.Mocked<SavedObjectsClientContract>;
    let mockPackagePolicyService: jest.Mocked<PackagePolicyServiceInterface>;

    beforeEach(() => {
      mockSavedObjectClient = savedObjectsClientMock.create();
      mockPackagePolicyService = createPackagePolicyServiceMock();
    });

    it('gets all endpoint package policies', async () => {
      const mockPolicy: PackagePolicy = {
        id: '1',
        policy_id: 'test-id-1',
      } as PackagePolicy;
      mockPackagePolicyService.list
        .mockResolvedValueOnce({
          items: [mockPolicy],
          total: 1,
          perPage: 10,
          page: 1,
        })
        .mockResolvedValueOnce({
          items: [],
          total: 1,
          perPage: 10,
          page: 1,
        });

      const endpointPackagePolicies = await getAllEndpointPackagePolicies(
        mockPackagePolicyService,
        mockSavedObjectClient
      );
      const expected: PackagePolicy[] = [mockPolicy];
      expect(endpointPackagePolicies).toEqual(expected);
    });
  });
});
