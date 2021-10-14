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
        return { error: jest.fn() };
      }),
    },
  };
});

describe('managed package policies', () => {
  afterEach(() => {
    (packagePolicyService.get as jest.Mock).mockReset();
    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockReset();
    (getPackageInfo as jest.Mock).mockReset();
    (packagePolicyService.upgrade as jest.Mock).mockReset();
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

    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockImplementationOnce(
      (savedObjectsClient: any, id: string) => {
        return {
          name: 'non-managed-package-policy',
          diff: [{ id: 'foo' }, { id: 'bar' }],
          hasErrors: false,
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

    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockImplementationOnce(
      (savedObjectsClient: any, id: string) => {
        return {
          name: 'non-managed-package-policy',
          diff: [{ id: 'foo' }, { id: 'bar' }],
          hasErrors: false,
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

  describe('when dry run reports conflicts', () => {
    it('should return errors + diff without performing upgrade', async () => {
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
              name: 'conflicting-package',
              title: 'Conflicting Package',
              version: '0.0.1',
            },
          };
        }
      );

      (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockImplementationOnce(
        (savedObjectsClient: any, id: string) => {
          return {
            name: 'conflicting-package-policy',
            diff: [
              { id: 'foo' },
              { id: 'bar', errors: [{ key: 'some.test.value', message: 'Conflict detected' }] },
            ],
            hasErrors: true,
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

      const result = await upgradeManagedPackagePolicies(soClient, esClient, [
        'conflicting-package-policy',
      ]);

      expect(result).toEqual([
        {
          packagePolicyId: 'conflicting-package-policy',
          diff: [
            {
              id: 'foo',
            },
            {
              id: 'bar',
              errors: [
                {
                  key: 'some.test.value',
                  message: 'Conflict detected',
                },
              ],
            },
          ],
          errors: [
            {
              key: 'some.test.value',
              message: 'Conflict detected',
            },
          ],
        },
      ]);

      expect(packagePolicyService.upgrade).not.toBeCalled();
    });
  });
});
