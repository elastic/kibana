/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicyMocks } from '../../mocks';

import { mapPackagePolicySavedObjectToPackagePolicy } from './utils';

describe('Package Policy Utils', () => {
  describe('mapPackagePolicySavedObjectToPackagePolicy()', () => {
    it('should return only exposed SO properties', () => {
      const soItem =
        PackagePolicyMocks.generatePackagePolicySavedObjectFindResponse().saved_objects.at(0)!;

      expect(mapPackagePolicySavedObjectToPackagePolicy(soItem)).toEqual({
        agents: 2,
        created_at: '2024-01-24T15:21:13.389Z',
        created_by: 'elastic',
        description: 'Policy for things',
        elasticsearch: {
          privileges: {
            cluster: [],
          },
        },
        enabled: true,
        id: 'so-123',
        inputs: [],
        is_managed: false,
        name: 'Package Policy 1',
        namespace: 'default',
        package: {
          name: 'endpoint',
          title: 'Elastic Endpoint',
          version: '1.0.0',
        },
        policy_id: '444-555-666',
        revision: 1,
        secret_references: [],
        updated_at: '2024-01-25T15:21:13.389Z',
        updated_by: 'user-a',
        vars: {},
        version: 'abc',
      });
    });
  });
});
