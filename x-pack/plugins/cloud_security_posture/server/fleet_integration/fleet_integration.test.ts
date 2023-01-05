/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import {
  isCspPackagePolicyInstalled,
  onPackagePolicyPostCreateCallback,
} from './fleet_integration';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';
import { CLOUD_SECURITY_POSTURE_PACKAGE_NAME } from '../../common/constants';
import { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

describe('is Csp package installed tests', () => {
  const logger = loggingSystemMock.createLogger();
  const mockSoClient = savedObjectsClientMock.create();
  const packagePolicyService = createPackagePolicyServiceMock();

  beforeEach(() => {
    return jest.clearAllMocks();
  });
  it.each([
    ['cloud_security_posture-41308bcdaaf665761478bb6f0d55555', ['default']],
    ['cloud_security_posture-41308bcdaaf665761478bb6f0d88888', ['foo']],
  ])(
    'validate that all index pattern are available cross spaces',
    async (id: string, namespaces: string[]) => {
      const mockPackagePolicy = createPackagePolicyMock();
      mockPackagePolicy.package!.name = CLOUD_SECURITY_POSTURE_PACKAGE_NAME;
      mockSoClient.find.mockResolvedValueOnce({
        saved_objects: [
          {
            type: 'index-pattern',
            id,
            namespaces,
          },
        ],
        pit_id: undefined,
      } as unknown as SavedObjectsFindResponse);

      await onPackagePolicyPostCreateCallback(logger, mockPackagePolicy, mockSoClient);

      expect(mockSoClient.updateObjectsSpaces).toHaveBeenCalled();
      expect(mockSoClient.updateObjectsSpaces).lastCalledWith(
        [
          {
            id,
            type: 'index-pattern',
          },
        ],
        ['*'],
        []
      );
    }
  );
  it.each([
    [1, [createPackagePolicyMock()], true],
    [0, [], false],
  ])(
    'isCspPackagePolicyInstalled should return true when other packages exist',
    async (total, items, expectedCspPolicyResponse) => {
      packagePolicyService.list.mockImplementationOnce(
        async (): Promise<ListResult<PackagePolicy>> => {
          return {
            items,
            total,
            page: 1,
            perPage: 1,
          };
        }
      );

      const isInstalled = await isCspPackagePolicyInstalled(
        packagePolicyService,
        mockSoClient,
        logger
      );
      expect(isInstalled).toEqual(expectedCspPolicyResponse);
    }
  );
});
