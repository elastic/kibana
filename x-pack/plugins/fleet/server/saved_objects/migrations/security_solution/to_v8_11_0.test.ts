/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createModelVersionTestMigrator,
  type ModelVersionTestMigrator,
} from '@kbn/core-test-helpers-model-versions';

import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';

import { getSavedObjectTypes } from '../..';

describe('8.10.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({
    manifestVersion,
  }: {
    manifestVersion: string | undefined;
  }): SavedObject<PackagePolicy> => {
    return {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'endpoint',
          title: '',
          version: '',
        },
        id: 'endpoint',
        policy_id: '',
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'endpoint',
            enabled: true,
            streams: [],
            config: {
              policy: {
                value: {
                  global_manifest_version: manifestVersion,
                },
              },
            },
          },
        ],
      },
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      references: [],
    };
  };

  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });
  });

  it('on update: adds manifest version field to policy, set to latest', () => {
    const initialDoc = policyDoc({ manifestVersion: undefined });

    const expectedMigratedDoc = policyDoc({ manifestVersion: 'latest' });

    const actualMigratedDoc = migrator.migrate<PackagePolicy, PackagePolicy>({
      document: initialDoc,
      fromVersion: 1,
      toVersion: 2,
    });

    expect(actualMigratedDoc.attributes).toEqual(expectedMigratedDoc.attributes);
  });

  it('forward compatibility: removes manifest version field from policy', () => {
    const initialDoc = policyDoc({ manifestVersion: 'latest' });

    const expectedMigratedDoc = policyDoc({ manifestVersion: undefined });

    const actualMigratedDoc = migrator.migrate<PackagePolicy, PackagePolicy>({
      document: initialDoc,
      fromVersion: 2, // fails, because `forwardCompatibility` runs on goin back *to* v2, not when going back *from* v2
      toVersion: 1,
    });

    expect(actualMigratedDoc.attributes).toEqual(expectedMigratedDoc.attributes);
  });

  it('forward compatibility 2: removes manifest version field from policy', () => {
    const initialDoc = policyDoc({ manifestVersion: 'latest' });

    const expectedMigratedDoc = policyDoc({ manifestVersion: undefined });

    const actualMigratedDoc = migrator.migrate<PackagePolicy, PackagePolicy>({
      document: initialDoc,
      fromVersion: 3, // success
      toVersion: 2,
    });

    expect(actualMigratedDoc.attributes).toEqual(expectedMigratedDoc.attributes);
  });

  it('on update: does not modify non-endpoint package policies', () => {
    const doc: SavedObject<PackagePolicy> = {
      id: 'mock-saved-object-id',
      attributes: {
        name: 'Some Policy Name',
        package: {
          name: 'notEndpoint',
          title: '',
          version: '',
        },
        id: 'notEndpoint',
        policy_id: '',
        enabled: true,
        namespace: '',
        revision: 0,
        updated_at: '',
        updated_by: '',
        created_at: '',
        created_by: '',
        inputs: [
          {
            type: 'notEndpoint',
            enabled: true,
            streams: [],
            config: {},
          },
        ],
      },
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      references: [],
    };

    const actualMigratedDoc = migrator.migrate<PackagePolicy, PackagePolicy>({
      document: doc,
      fromVersion: 1,
      toVersion: 2,
    });

    expect(actualMigratedDoc.attributes).toEqual({
      name: 'Some Policy Name',
      package: {
        name: 'notEndpoint',
        title: '',
        version: '',
      },
      id: 'notEndpoint',
      policy_id: '',
      enabled: true,
      namespace: '',
      revision: 0,
      updated_at: '',
      updated_by: '',
      created_at: '',
      created_by: '',
      inputs: [
        {
          type: 'notEndpoint',
          enabled: true,
          streams: [],
          config: {},
        },
      ],
    });
  });
});
