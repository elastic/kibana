/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from '@kbn/core/server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV7160 as migration } from './to_v7_16_0';

describe('7.16.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({
    windowsMemory = {},
    windowsBehavior = {},
    windowsPopup = {},
    windowsMalware = {},
    windowsRansomware = {},
    macBehavior = {},
    macMemory = {},
    macMalware = {},
    macPopup = {},
    linuxBehavior = {},
    linuxMemory = {},
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
                    ...windowsMemory,
                    ...windowsBehavior,
                    ...windowsPopup,
                  },
                  mac: {
                    ...macMalware,
                    ...macBehavior,
                    ...macMemory,
                    ...macPopup,
                  },
                  linux: {
                    ...linuxMalware,
                    ...linuxBehavior,
                    ...linuxMemory,
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

  it('adds mac and linux memory protection alongside behavior, malware, and ramsomware', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off' } },
      windowsRansomware: { ransomware: { mode: 'off', supported: true } },
      windowsBehavior: { behavior_protection: { mode: 'off', supported: true } },
      windowsMemory: { memory_protection: { mode: 'off', supported: true } },
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
          behavior_protection: {
            message: '',
            enabled: true,
          },
          memory_protection: {
            message: '',
            enabled: true,
          },
        },
      },
      macMalware: { malware: { mode: 'off' } },
      macBehavior: { behavior_protection: { mode: 'off', supported: true } },
      macPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          behavior_protection: {
            message: '',
            enabled: true,
          },
        },
      },
      linuxMalware: { malware: { mode: 'off' } },
      linuxBehavior: { behavior_protection: { mode: 'off', supported: true } },
      linuxPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          behavior_protection: {
            message: '',
            enabled: true,
          },
        },
      },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off' } },
      windowsRansomware: { ransomware: { mode: 'off', supported: true } },
      // new memory protection
      windowsMemory: { memory_protection: { mode: 'off', supported: true } },
      windowsBehavior: { behavior_protection: { mode: 'off', supported: true } },
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
          memory_protection: {
            message: '',
            enabled: true,
          },
          behavior_protection: {
            message: '',
            enabled: true,
          },
        },
      },
      macMalware: { malware: { mode: 'off' } },
      macBehavior: { behavior_protection: { mode: 'off', supported: true } },
      macMemory: { memory_protection: { mode: 'off', supported: true } },
      macPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          behavior_protection: {
            message: '',
            enabled: true,
          },
          // new memory popup setup
          memory_protection: {
            message: '',
            enabled: false,
          },
        },
      },
      linuxMalware: { malware: { mode: 'off' } },
      linuxBehavior: { behavior_protection: { mode: 'off', supported: true } },
      linuxMemory: { memory_protection: { mode: 'off', supported: true } },
      linuxPopup: {
        popup: {
          malware: {
            message: '',
            enabled: true,
          },
          behavior_protection: {
            message: '',
            enabled: true,
          },
          // new memory popup setup
          memory_protection: {
            message: '',
            enabled: false,
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
