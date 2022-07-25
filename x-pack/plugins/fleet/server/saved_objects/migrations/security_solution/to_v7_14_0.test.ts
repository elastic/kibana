/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

import { migrateEndpointPackagePolicyToV7140 } from './to_v7_14_0';

describe('7.14.0 Endpoint Package Policy migration', () => {
  const migration = migrateEndpointPackagePolicyToV7140;
  const policyDoc = ({
    windowsMalware = {},
    windowsRansomware = {},
    windowsPopup = {},
    linuxMalware = {},
    linuxPopup = {},
  }) => {
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
                    ...windowsMalware,
                    ...windowsRansomware,
                    ...windowsPopup,
                  },
                  linux: {
                    events: { process: true, file: true, network: true },
                    logging: { file: 'info' },
                    ...linuxMalware,
                    ...linuxPopup,
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

  it('adds supported option for ransomware on migrations and linux malware when windows malware is disabled', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off' } },
      windowsRansomware: { ransomware: { mode: 'off' } },
      windowsPopup: {
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
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off' } },
      windowsRansomware: { ransomware: { mode: 'off', supported: true } },
      windowsPopup: {
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
      linuxMalware: {
        malware: {
          mode: 'off',
        },
      },
      linuxPopup: {
        popup: {
          malware: {
            message: '',
            enabled: false,
          },
        },
      },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds supported option for ransomware on migrations and linux malware option and notification customization when windows malware is enabled', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'on' } },
      windowsRansomware: { ransomware: { mode: 'on' } },
      windowsPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          ransomware: {
            message: '',
            enabled: true,
          },
        },
      },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'on' } },
      windowsRansomware: { ransomware: { mode: 'on', supported: true } },
      windowsPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          ransomware: {
            message: '',
            enabled: true,
          },
        },
      },
      linuxMalware: {
        malware: {
          mode: 'on',
        },
      },
      linuxPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
        },
      },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds supported option for ransomware on migrations and linux malware option and notification customization when ransomware is malformed', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'on' } },
      windowsRansomware: { ransomware: 'off' },
      windowsPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          ransomware: {
            message: '',
            enabled: true,
          },
        },
      },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'on' } },
      windowsRansomware: { ransomware: { mode: 'off', supported: true } },
      windowsPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          ransomware: {
            message: '',
            enabled: true,
          },
        },
      },
      linuxMalware: {
        malware: {
          mode: 'on',
        },
      },
      linuxPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
        },
      },
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
