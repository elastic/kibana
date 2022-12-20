/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createPackagePolicyServiceMock } from '@kbn/fleet-plugin/server/mocks';
import { ListResult, PackagePolicy } from '@kbn/fleet-plugin/common';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { isCspPackagePolicyInstalled } from './fleet_integration';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { createPackagePolicyMock } from '@kbn/fleet-plugin/common/mocks';

describe('is Csp package installed tests', () => {
  const logger = loggingSystemMock.createLogger();
  const soClient = savedObjectsClientMock.create();
  const packagePolicyService = createPackagePolicyServiceMock();

  beforeEach(() => jest.clearAllMocks());
  it.each`
    total | items                          | expectedCspPolicyResponse
    ${1}  | ${[createPackagePolicyMock()]} | ${true}
    ${0}  | ${[]}                          | ${false}
  `(
    'isCspPackagePolicyInstalled should return true when other packages exist',
    async ({ total, items, expectedCspPolicyResponse }) => {
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

      const isInstalled = await isCspPackagePolicyInstalled(packagePolicyService, soClient, logger);
      expect(isInstalled).toEqual(expectedCspPolicyResponse);
    }
  );
});
