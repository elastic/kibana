/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PostDeletePackagePoliciesResponse, NewPackagePolicy, PackagePolicy } from './types';
import type { FleetAuthz } from './authz';
import { ENDPOINT_PRIVILEGES } from './constants';

export const createNewPackagePolicyMock = (): NewPackagePolicy => {
  return {
    name: 'endpoint-1',
    description: '',
    namespace: 'default',
    enabled: true,
    policy_id: '93c46720-c217-11ea-9906-b5b8a21b268e',
    package: {
      name: 'endpoint',
      title: 'Elastic Endpoint',
      version: '0.9.0',
    },
    inputs: [],
  };
};

export const createPackagePolicyMock = (): PackagePolicy => {
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
        type: 'endpoint',
        streams: [],
      },
    ],
  };
};

export const deletePackagePolicyMock = (): PostDeletePackagePoliciesResponse => {
  const newPackagePolicy = createNewPackagePolicyMock();
  return [
    {
      id: 'c6d16e42-c32d-4dce-8a88-113cfe276ad1',
      success: true,
      package: newPackagePolicy.package,
    },
  ];
};

/**
 * Creates mock `authz` object
 */
export const createFleetAuthzMock = (): FleetAuthz => {
  const endpointActions = Object.keys(ENDPOINT_PRIVILEGES).reduce((acc, privilege) => {
    return {
      ...acc,
      [privilege]: {
        executePackageAction: true,
      },
    };
  }, {});

  return {
    fleet: {
      all: true,
      setup: true,
      readEnrollmentTokens: true,
      readAgentPolicies: true,
    },
    integrations: {
      readPackageInfo: true,
      readInstalledPackages: true,
      installPackages: true,
      upgradePackages: true,
      uploadPackages: true,
      removePackages: true,
      readPackageSettings: true,
      writePackageSettings: true,
      readIntegrationPolicies: true,
      writeIntegrationPolicies: true,
    },
    packagePrivileges: {
      endpoint: {
        actions: endpointActions,
      },
    },
  };
};
