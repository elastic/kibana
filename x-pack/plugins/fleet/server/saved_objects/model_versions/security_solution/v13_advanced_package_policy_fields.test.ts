/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-common/src/server_types';

import type { ModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';

import { cloneDeep } from 'lodash';

import type { PackagePolicy } from '../../../../common';

import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';
import { getSavedObjectTypes } from '../..';

const policyDoc: SavedObject<PackagePolicy> = {
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
    policy_ids: [''],
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
                malware: {
                  mode: 'detect',
                  blocklist: true,
                },
                antivirus_registration: {
                  enabled: true,
                },
              },
              mac: {
                malware: {
                  mode: 'detect',
                  blocklist: true,
                },
              },
              linux: {
                malware: {
                  mode: 'detect',
                  blocklist: true,
                },
              },
            },
          },
        },
      },
    ],
  },
  type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  references: [],
};

describe('8.15.0 Endpoint Package Policy migration', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });
  });

  describe('backfilling `advanced` fields for Windows, Linux, and Mac', () => {
    it('should backfill `advanced` fields on Kibana update if there are no advanced options yet', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 12,
        toVersion: 13,
      });
      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig.windows.advanced).toEqual({
        events: {
          deduplicate_network_events: false,
          ancestry_in_all_events: true,
          process_ancestry_length: 20,
        },
      });
      expect(migratedPolicyConfig.linux.advanced).toEqual({
        events: {
          deduplicate_network_events: false,
          ancestry_in_all_events: true,
          process_ancestry_length: 20,
        },
      });
      expect(migratedPolicyConfig.mac.advanced).toEqual({
        events: {
          deduplicate_network_events: false,
          ancestry_in_all_events: true,
          process_ancestry_length: 20,
        },
      });
    });
    it('should backfill `advanced` fields without modifying other `advanced` options', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.linux.advanced = {
        ping: 'pong',
      };
      originalPolicyConfig.windows.advanced = {
        ping: 'pong pong',
      };
      originalPolicyConfig.mac.advanced = {
        ping: 'pong pong pong',
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);

      expectedPolicyConfig.windows.advanced.events = {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
      };
      expectedPolicyConfig.linux.advanced.events = {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
      };
      expectedPolicyConfig.mac.advanced.events = {
        deduplicate_network_events: false,
        process_ancestry_length: 20,
        ancestry_in_all_events: true,
      };

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 12,
        toVersion: 13,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });
    it('should backfill `advanced` fields without modifying other `events`', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.windows.advanced = {
        events: {
          ping: 'pong',
        },
      };
      originalPolicyConfig.linux.advanced = {
        events: {
          ping: 'pong',
        },
      };
      originalPolicyConfig.mac.advanced = {
        events: {
          ping: 'pong',
        },
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);

      expectedPolicyConfig.windows.advanced.events.deduplicate_network_events = false;
      expectedPolicyConfig.windows.advanced.events.process_ancestry_length = 20;
      expectedPolicyConfig.windows.advanced.events.ancestry_in_all_events = true;
      expectedPolicyConfig.linux.advanced.events.deduplicate_network_events = false;
      expectedPolicyConfig.linux.advanced.events.process_ancestry_length = 20;
      expectedPolicyConfig.linux.advanced.events.ancestry_in_all_events = true;
      expectedPolicyConfig.mac.advanced.events.deduplicate_network_events = false;
      expectedPolicyConfig.mac.advanced.events.process_ancestry_length = 20;
      expectedPolicyConfig.mac.advanced.events.ancestry_in_all_events = true;

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 12,
        toVersion: 13,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });
    it('should not backfill `advanced` fields if values are already present', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.windows.advanced = {
        events: {
          deduplicate_network_events: true,
          process_ancestry_length: 10,
          ancestry_in_all_events: false,
        },
      };
      originalPolicyConfig.linux.advanced = {
        events: {
          deduplicate_network_events: true,
          process_ancestry_length: 10,
          ancestry_in_all_events: false,
        },
      };
      originalPolicyConfig.mac.advanced = {
        events: {
          deduplicate_network_events: true,
          process_ancestry_length: 10,
          ancestry_in_all_events: false,
        },
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 12,
        toVersion: 13,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });
  });
});
