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

import { cloneDeep } from 'lodash';

import type { SavedObject } from '@kbn/core-saved-objects-server';

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

describe('8.14.0 Endpoint Package Policy migration', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });
  });

  describe('backfilling `on_write_scan`', () => {
    it('should backfill `on_write_scan` field to malware protections on Kibana update', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 5,
        toVersion: 6,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig.windows.malware.on_write_scan).toBe(true);
      expect(migratedPolicyConfig.mac.malware.on_write_scan).toBe(true);
      expect(migratedPolicyConfig.linux.malware.on_write_scan).toBe(true);
    });

    it('should not backfill `on_write_scan` field if already present due to user edit before migration is performed on serverless', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.windows.malware.on_write_scan = false;
      originalPolicyConfig.mac.malware.on_write_scan = true;
      originalPolicyConfig.linux.malware.on_write_scan = false;

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 5,
        toVersion: 6,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig.windows.malware.on_write_scan).toBe(false);
      expect(migratedPolicyConfig.mac.malware.on_write_scan).toBe(true);
      expect(migratedPolicyConfig.linux.malware.on_write_scan).toBe(false);
    });

    // no reason for removing `on_write_scan` for a lower version Kibana - the field will just sit silently in the package config
    it('should not strip `on_write_scan` in regards of forward compatibility', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.windows.malware.on_write_scan = false;
      originalPolicyConfig.mac.malware.on_write_scan = true;
      originalPolicyConfig.linux.malware.on_write_scan = false;

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 6,
        toVersion: 5,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig.windows.malware.on_write_scan).toBe(false);
      expect(migratedPolicyConfig.mac.malware.on_write_scan).toBe(true);
      expect(migratedPolicyConfig.linux.malware.on_write_scan).toBe(false);
    });
  });

  describe('backfilling `linux.advanced.events.enable_caps`', () => {
    it('should backfill `enable_caps` field on Kibana update if there are no advanced options yet', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const expectedPolicyConfig = cloneDeep(policyDoc).attributes.inputs[0].config?.policy.value;
      expectedPolicyConfig.linux.advanced = {
        events: {
          enable_caps: true,
        },
      };

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 6,
        toVersion: 7,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });

    it('should backfill `enable_caps` field without modifying other `advanced` options', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.linux.advanced = {
        cheese: 'brie',
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);
      expectedPolicyConfig.linux.advanced.events = {
        enable_caps: true,
      };

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 6,
        toVersion: 7,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });

    it('should backfill `enable_caps` without modifying other `events`', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.linux.advanced = {
        events: {
          cheese: 'brie',
        },
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);
      expectedPolicyConfig.linux.advanced.events.enable_caps = true;

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 6,
        toVersion: 7,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });

    it('should not backfill `enable_caps` field if already present', () => {
      const originalPolicyConfigSO = cloneDeep(policyDoc);
      const originalPolicyConfig = originalPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      originalPolicyConfig.linux.advanced = {
        events: {
          cheese: 'brie',
          enable_caps: false,
        },
      };
      const expectedPolicyConfig = cloneDeep(originalPolicyConfig);

      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: originalPolicyConfigSO,
        fromVersion: 6,
        toVersion: 7,
      });

      const migratedPolicyConfig = migratedPolicyConfigSO.attributes.inputs[0].config?.policy.value;
      expect(migratedPolicyConfig).toStrictEqual(expectedPolicyConfig);
    });
  });
});
