/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsFindResponse } from '@kbn/core-saved-objects-api-server';

import type { SavedObjectsFindResult } from '@kbn/core-saved-objects-api-server';

import { mapPackagePolicySavedObjectToPackagePolicy } from '../services/package_policies';

import type { PackagePolicy } from '../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../common';

import type { PackagePolicySOAttributes } from '../types';

const generatePackagePolicySOAttributesMock = (
  overrides: Partial<PackagePolicySOAttributes> = {}
): PackagePolicySOAttributes => {
  return {
    name: `Package Policy 1`,
    description: 'Policy for things',
    created_at: '2024-01-24T15:21:13.389Z',
    created_by: 'elastic',
    updated_at: '2024-01-25T15:21:13.389Z',
    updated_by: 'user-a',
    policy_id: '444-555-666',
    policy_ids: ['444-555-666'],
    enabled: true,
    inputs: [],
    namespace: 'default',
    package: {
      name: 'endpoint',
      title: 'Elastic Endpoint',
      version: '1.0.0',
    },
    revision: 1,
    is_managed: false,
    secret_references: [],
    vars: {},
    elasticsearch: {
      privileges: {
        cluster: [],
      },
    },
    agents: 2,

    ...overrides,
  };
};

const generatePackagePolicyMock = (overrides: Partial<PackagePolicy> = {}) => {
  return {
    ...mapPackagePolicySavedObjectToPackagePolicy(generatePackagePolicySavedObjectMock()),
    ...overrides,
  };
};

const generatePackagePolicySavedObjectMock = (
  soAttributes: PackagePolicySOAttributes = generatePackagePolicySOAttributesMock()
): SavedObjectsFindResult<PackagePolicySOAttributes> => {
  return {
    score: 1,
    id: 'so-123',
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    version: 'abc',
    created_at: soAttributes.created_at,
    updated_at: soAttributes.updated_at,
    attributes: soAttributes,
    references: [],
    sort: ['created_at'],
  };
};

const generatePackagePolicySavedObjectFindResponseMock = (
  soResults?: PackagePolicySOAttributes[]
): SavedObjectsFindResponse<PackagePolicySOAttributes> => {
  const soList = soResults ?? [
    generatePackagePolicySOAttributesMock(),
    generatePackagePolicySOAttributesMock(),
  ];

  return {
    saved_objects: soList.map((soAttributes) => {
      return {
        score: 1,
        id: 'so-123',
        type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
        version: 'abc',
        created_at: soAttributes.created_at,
        updated_at: soAttributes.updated_at,
        attributes: soAttributes,
        references: [],
        sort: ['created_at'],
      };
    }),
    total: soList.length,
    per_page: 10,
    page: 1,
    pit_id: 'pit-id-1',
  };
};

export const PackagePolicyMocks = Object.freeze({
  generatePackagePolicySOAttributes: generatePackagePolicySOAttributesMock,
  generatePackagePolicySavedObjectFindResponse: generatePackagePolicySavedObjectFindResponseMock,
  generatePackagePolicy: generatePackagePolicyMock,
});
