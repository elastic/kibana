/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from 'kibana/server';
import { PackagePolicy } from '../../../../../fleet/common';
import { PolicyData, ProtectionModes } from '../../types';
import { migratePackagePolicyToV7120 } from './to_v7_12_0';

describe('7.12.0 Endpoint Package Policy migration', () => {
  const migration = migratePackagePolicyToV7120;
  it('adds ransomware option and notification customization', () => {
    const doc: SavedObjectUnsanitizedDoc<PolicyData> = {
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
                    // @ts-expect-error
                    popup: {
                      malware: {
                        message: '',
                        enabled: false,
                      },
                    },
                  },
                  mac: {
                    // @ts-expect-error
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
    };

    expect(
      migration(doc, {} as SavedObjectMigrationContext) as SavedObjectUnsanitizedDoc<PolicyData>
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
                    ransomware: ProtectionModes.off,
                    popup: {
                      malware: {
                        message: '',
                        enabled: false,
                      },
                      ransomware: {
                        message: '',
                        enabled: false,
                      },
                    },
                  },
                  mac: {
                    ransomware: ProtectionModes.off,
                    popup: {
                      malware: {
                        message: '',
                        enabled: false,
                      },
                      ransomware: {
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
      id: 'mock-saved-object-id',
    });
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
      id: 'mock-saved-object-id',
    });
  });
});
