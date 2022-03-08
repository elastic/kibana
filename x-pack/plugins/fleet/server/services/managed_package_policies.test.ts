/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, savedObjectsClientMock } from 'src/core/server/mocks';

import { upgradeManagedPackagePolicies } from './managed_package_policies';
import { packagePolicyService } from './package_policy';
import { getInstallations } from './epm/packages';

jest.mock('./package_policy');
jest.mock('./epm/packages');
jest.mock('./app_context', () => {
  return {
    ...jest.requireActual('./app_context'),
    appContextService: {
      getLogger: jest.fn(() => {
        return { error: jest.fn(), debug: jest.fn() };
      }),
    },
  };
});

describe('upgradeManagedPackagePolicies', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not upgrade policies for non-managed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [],
    });

    await upgradeManagedPackagePolicies(soClient, esClient);

    expect(packagePolicyService.upgrade).not.toBeCalled();
  });

  it('should upgrade policies for managed package', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();
    const packagePolicy = {
      id: 'managed-package-id',
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

    (packagePolicyService.list as jest.Mock).mockResolvedValueOnce({
      items: [packagePolicy],
    });

    (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValueOnce({
      name: 'non-managed-package-policy',
      diff: [{ id: 'foo' }, { id: 'bar' }],
      hasErrors: false,
    });

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            id: 'test-installation',
            version: '1.0.0',
            keep_policies_up_to_date: true,
          },
        },
      ],
    });

    const results = await upgradeManagedPackagePolicies(soClient, esClient);
    expect(results).toEqual([
      { packagePolicyId: 'managed-package-id', diff: [{ id: 'foo' }, { id: 'bar' }], errors: [] },
    ]);

    expect(packagePolicyService.upgrade).toBeCalledWith(
      soClient,
      esClient,
      ['managed-package-id'],
      undefined,
      packagePolicy,
      '1.0.0'
    );
  });

  it('should not upgrade policy if newer than installed package version', async () => {
    const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
    const soClient = savedObjectsClientMock.create();

    (packagePolicyService.list as jest.Mock).mockResolvedValueOnce({
      items: [
        {
          id: 'managed-package-id',
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
            version: '1.0.1',
          },
        },
      ],
    });

    (getInstallations as jest.Mock).mockResolvedValueOnce({
      saved_objects: [
        {
          attributes: {
            id: 'test-installation',
            version: '1.0.0',
            keep_policies_up_to_date: true,
          },
        },
      ],
    });

    await upgradeManagedPackagePolicies(soClient, esClient);

    expect(packagePolicyService.getUpgradeDryRunDiff).not.toHaveBeenCalled();
    expect(packagePolicyService.upgrade).not.toHaveBeenCalled();
  });

  describe('when dry run reports conflicts', () => {
    it('should return errors + diff without performing upgrade', async () => {
      const esClient = elasticsearchServiceMock.createClusterClient().asInternalUser;
      const soClient = savedObjectsClientMock.create();

      (packagePolicyService.list as jest.Mock).mockResolvedValueOnce({
        items: [
          {
            id: 'conflicting-package-policy',
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
          },
        ],
      });

      (packagePolicyService.getUpgradeDryRunDiff as jest.Mock).mockResolvedValueOnce({
        name: 'conflicting-package-policy',
        diff: [
          { id: 'foo' },
          { id: 'bar', errors: [{ key: 'some.test.value', message: 'Conflict detected' }] },
        ],
        hasErrors: true,
      });

      (getInstallations as jest.Mock).mockResolvedValueOnce({
        saved_objects: [
          {
            attributes: {
              id: 'test-installation',
              version: '1.0.0',
              keep_policies_up_to_date: true,
            },
          },
        ],
      });

      const result = await upgradeManagedPackagePolicies(soClient, esClient);

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
