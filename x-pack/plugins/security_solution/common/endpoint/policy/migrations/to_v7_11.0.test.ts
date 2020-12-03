/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { PackagePolicy } from '../../../../../fleet/common';
import { migratePackagePolicyToV7110 } from './to_v7_11.0';

describe('7.11.0 Endpoint Package Policy migration', () => {
  const migration = migratePackagePolicyToV7110;
  it('adds malware notification checkbox and optional message and adds AV registration config', () => {
    const doc: SavedObjectUnsanitizedDoc<PackagePolicy> = {
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
                  mac: {},
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
                    antivirus_registration: { enabled: false },
                    popup: {
                      malware: {
                        message: '',
                        enabled: false,
                      },
                    },
                  },
                  mac: {
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

  it('does not modify non-endpoint package policies', () => {
    const doc: SavedObjectUnsanitizedDoc<PackagePolicy> = {
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
        output_id: '',
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
        output_id: '',
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
    });
  });
});
