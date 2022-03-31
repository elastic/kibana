/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectMigrationContext, SavedObjectUnsanitizedDoc } from 'kibana/server';

import type { PackagePolicy } from '../../../../common';

import { migratePackagePolicyToV820 as migration } from './to_v8_2_0';

describe('8.2.0 Endpoint Package Policy migration', () => {
  const policyDoc = ({
    windowsMalware = {},
    macMalware = {},
    linuxMalware = {},
    linuxEvents = {},
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
                  },
                  mac: {
                    ...macMalware,
                  },
                  linux: {
                    ...linuxMalware,
                    ...linuxEvents,
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

  it('adds blocklist defaulted to false if malware is off', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off' } },
      macMalware: { malware: { mode: 'off' } },
      linuxMalware: { malware: { mode: 'off' } },
      linuxEvents: { events: { process: true, file: true, network: true } },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'off', blocklist: false } },
      macMalware: { malware: { mode: 'off', blocklist: false } },
      linuxMalware: { malware: { mode: 'off', blocklist: false } },
      linuxEvents: { events: { process: true, file: true, network: true, session_data: false } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds blocklist defaulted to true if malware is prevent', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'prevent' } },
      macMalware: { malware: { mode: 'prevent' } },
      linuxMalware: { malware: { mode: 'prevent' } },
      linuxEvents: { events: { process: true, file: true, network: true } },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'prevent', blocklist: true } },
      macMalware: { malware: { mode: 'prevent', blocklist: true } },
      linuxMalware: { malware: { mode: 'prevent', blocklist: true } },
      linuxEvents: { events: { process: true, file: true, network: true, session_data: false } },
    });

    expect(migration(initialDoc, {} as SavedObjectMigrationContext)).toEqual(migratedDoc);
  });

  it('adds blocklist defaulted to true if malware is detect', () => {
    const initialDoc = policyDoc({
      windowsMalware: { malware: { mode: 'detect' } },
      macMalware: { malware: { mode: 'detect' } },
      linuxMalware: { malware: { mode: 'detect' } },
      linuxEvents: { events: { process: true, file: true, network: true } },
    });

    const migratedDoc = policyDoc({
      windowsMalware: { malware: { mode: 'detect', blocklist: true } },
      macMalware: { malware: { mode: 'detect', blocklist: true } },
      linuxMalware: { malware: { mode: 'detect', blocklist: true } },
      linuxEvents: { events: { process: true, file: true, network: true, session_data: false } },
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
