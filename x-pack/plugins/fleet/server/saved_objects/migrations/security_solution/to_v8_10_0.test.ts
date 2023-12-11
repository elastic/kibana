/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { SavedObjectModelTransformationContext } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV8100 as migration } from './to_v8_10_0';
import { migratePackagePolicyEvictionsFromV8100 as eviction } from './to_v8_10_0';

describe('8.10.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({ behaviorProtection = {}, meta = {} }) => {
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
                  meta: { license: '', cloud: false, ...meta },
                  windows: {
                    behavior_protection: {
                      ...behaviorProtection,
                    },
                  },
                  mac: {
                    behavior_protection: {
                      ...behaviorProtection,
                    },
                  },
                  linux: {
                    behavior_protection: {
                      ...behaviorProtection,
                    },
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

  it('adds reputation service field to behaviour protection, set to false and adds license_uid and cluster info, defaulted to empty string without overwiting existing meta values', () => {
    const initialDoc = policyDoc({});

    const migratedDoc = policyDoc({
      behaviorProtection: { reputation_service: false },
      meta: { license_uid: '', cluster_uuid: '', cluster_name: '' },
    });

    expect(migration(initialDoc, {} as SavedObjectModelTransformationContext)).toEqual({
      attributes: {
        inputs: migratedDoc.attributes.inputs,
      },
    });
  });

  it('removes reputation service from behaviour protection and remove new meta values', () => {
    const initialDoc = policyDoc({
      behaviorProtection: { reputation_service: true },
      meta: { license_uid: '', cluster_uuid: '', cluster_name: '' },
    });

    const migratedDoc = policyDoc({});

    expect(eviction(initialDoc.attributes)).toEqual(migratedDoc.attributes);
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
      migration(
        doc,
        {} as SavedObjectModelTransformationContext
      ) as SavedObjectUnsanitizedDoc<PackagePolicy>
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
    });
  });
});
