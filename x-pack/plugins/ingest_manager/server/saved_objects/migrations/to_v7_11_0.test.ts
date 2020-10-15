/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { PackagePolicy } from '../../types';
import { migratePackagePolicyToV7110 } from './to_v7_11_0';

describe('7.11.0 Endpoint Package Policy migration', () => {
  const migration = migratePackagePolicyToV7110;
  it('adds malware notification checkbox and optional message', () => {
    const doc = {
      attributes: {
        name: 'endpoint',
        id: 'endpoint',
        policy_id: '',
        enabled: true,
        namespace: '',
        output_id: '',
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
                  windows: {},
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    };

    expect(
      migration(doc, {} as SavedObjectMigrationContext) as SavedObjectUnsanitizedDoc<PackagePolicy>
    ).toEqual({
      attributes: {
        name: 'endpoint',
        id: 'endpoint',
        policy_id: '',
        enabled: true,
        namespace: '',
        output_id: '',
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
                    popup: {
                      malware: {
                        message: '',
                        enabled: false,
                      },
                    },
                  },
                },
              },
            },
          },
        ],
      },
      type: ' nested',
    });
  });
});
