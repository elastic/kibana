/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV830 as migration } from './to_v8_3_0';

describe('8.3.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({ windowsAdvanced = {}, macAdvanced = {}, linuxAdvanced = {} }) => {
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
                  windows: {
                    ...windowsAdvanced,
                  },
                  mac: {
                    ...macAdvanced,
                  },
                  linux: {
                    ...linuxAdvanced,
                  },
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };
  };

  it('adds advanced event filters defaulted to false', () => {
    const initialDoc = policyDoc({});

    const migratedDoc = policyDoc({
      windowsAdvanced: { advanced: { event_filters: { default: false } } },
      macAdvanced: { advanced: { event_filters: { default: false } } },
      linuxAdvanced: { advanced: { event_filters: { default: false } } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds advanced event filters defaulted to false and preserves existing advanced fields', () => {
    const initialDoc = policyDoc({
      windowsAdvanced: { advanced: { existingAdvanced: true } },
      macAdvanced: { advanced: { existingAdvanced: true } },
      linuxAdvanced: { advanced: { existingAdvanced: true } },
    });

    const migratedDoc = policyDoc({
      windowsAdvanced: { advanced: { event_filters: { default: false }, existingAdvanced: true } },
      macAdvanced: { advanced: { event_filters: { default: false }, existingAdvanced: true } },
      linuxAdvanced: { advanced: { event_filters: { default: false }, existingAdvanced: true } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('does not modify non-endpoint package policies', () => {
    const doc: SavedObjectUnsanitizedDoc<PackagePolicy> = {
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
      type: ' nested',
    };

    expect(
      migration(doc, {} as SavedObjectMigrationContext) as SavedObjectUnsanitizedDoc<PackagePolicy>
    ).toEqual({
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
      type: ' nested',
      id: 'mock-saved-object-id',
    });
  });
});
