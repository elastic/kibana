/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import { upgradeManagedPackagePolicies } from './managed_package_policies';
import { packagePolicyService } from './package_policy';
import { getPackageInfo } from './epm/packages';

jest.mock('./package_policy');
jest.mock('./epm/packages');
jest.mock('./app_context', () => {
  return {
    ...jest.requireActual('./app_context'),
    appContextService: {
      getLogger: jest.fn(() => {
        return { debug: jest.fn() };
      }),
    },
  };
});

describe('managed package policies', () => {
  afterEach(() => {
    (packagePolicyService.get as jest.Mock).mockReset();
    (getPackageInfo as jest.Mock).mockReset();
  });

  it('should not upgrade policies for non-managed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.get as jest.Mock).mockImplementationOnce(
      (savedObjectsClient: any, id: string) => {
        return {
          id,
          inputs: {},
          version: '',
          revision: 1,
          updated_at: '',
          updated_by: '',
          created_at: '',
          created_by: '',
          package: {
            name: 'non-managed-package',
            title: 'Non-Managed Package',
            version: '0.0.1',
          },
        };
      }
    );

    (getPackageInfo as jest.Mock).mockImplementationOnce(
      ({ savedObjectsClient, pkgName, pkgVersion }) => ({
        name: pkgName,
        version: pkgVersion,
        keepPoliciesUpToDate: false,
      })
    );

    await upgradeManagedPackagePolicies(soClient, esClient, ['non-managed-package-id']);

    expect(packagePolicyService.upgrade).not.toBeCalled();
  });

  it('should upgrade policies for managed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.get as jest.Mock).mockImplementationOnce(
      (savedObjectsClient: any, id: string) => {
        return {
          id,
          inputs: {},
          version: '',
          revision: 1,
          updated_at: '',
          updated_by: '',
          created_at: '',
          created_by: '',
          package: {
            name: 'managed-package',
            title: 'Managed Package',
            version: '0.0.1',
          },
        };
      }
    );

    (getPackageInfo as jest.Mock).mockImplementationOnce(
      ({ savedObjectsClient, pkgName, pkgVersion }) => ({
        name: pkgName,
        version: pkgVersion,
        keepPoliciesUpToDate: true,
      })
    );

    await upgradeManagedPackagePolicies(soClient, esClient, ['managed-package-id']);

    expect(packagePolicyService.upgrade).toBeCalledWith(soClient, esClient, ['managed-package-id']);
  });
});
