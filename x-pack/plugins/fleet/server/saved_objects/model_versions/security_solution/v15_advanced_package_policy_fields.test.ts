/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { ModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';

import { getSavedObjectTypes } from '../..';

import type { PackagePolicy } from '../../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';

describe('Defend integration advanced policy fields v8.16.0', () => {
  let migrator: ModelVersionTestMigrator;
  let policyConfigSO: SavedObject<PackagePolicy>;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });

    policyConfigSO = {
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
        policy_ids: [],
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
                  windows: {},
                  mac: {},
                  linux: {},
                },
              },
            },
          },
        ],
      },
      type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
      references: [],
    };
  });

  describe('when updating to model version 15', () => {
    describe('backfilling `aggregate_process` with `false`', () => {
      it('should backfill when there are no advanced options yet', () => {
        const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
          document: policyConfigSO,
          fromVersion: 14,
          toVersion: 15,
        });

        const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

        expectConfigToHave(migratedPolicyConfig, 'advanced.events.aggregate_process', false);
      });

      it('should backfill without modifying other advanced options', () => {
        const policyConfig = getConfig(policyConfigSO);
        policyConfig.windows.advanced = { cheese: 'brie' };
        policyConfig.mac.advanced = { cheese: 'maasdam' };
        policyConfig.linux.advanced = { cheese: 'camambert' };

        const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
          document: policyConfigSO,
          fromVersion: 14,
          toVersion: 15,
        });

        const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

        expectConfigToHave(migratedPolicyConfig, 'advanced.events.aggregate_process', false);
        expect(migratedPolicyConfig.windows.advanced.cheese).toBe('brie');
        expect(migratedPolicyConfig.mac.advanced.cheese).toBe('maasdam');
        expect(migratedPolicyConfig.linux.advanced.cheese).toBe('camambert');
      });

      it('should backfill without modifying other event options', () => {
        const policyConfig = getConfig(policyConfigSO);
        policyConfig.windows.advanced = { events: { cheese: 'brie' } };
        policyConfig.mac.advanced = { events: { cheese: 'maasdam' } };
        policyConfig.linux.advanced = { events: { cheese: 'camambert' } };

        const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
          document: policyConfigSO,
          fromVersion: 14,
          toVersion: 15,
        });

        const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

        expectConfigToHave(migratedPolicyConfig, 'advanced.events.aggregate_process', false);
        expect(migratedPolicyConfig.windows.advanced.events.cheese).toBe('brie');
        expect(migratedPolicyConfig.mac.advanced.events.cheese).toBe('maasdam');
        expect(migratedPolicyConfig.linux.advanced.events.cheese).toBe('camambert');
      });

      it('should not backfill if field is already present', () => {
        const policyConfig = getConfig(policyConfigSO);
        policyConfig.windows.advanced = { events: { aggregate_process: true } };
        policyConfig.mac.advanced = { events: { aggregate_process: true } };
        policyConfig.linux.advanced = { events: { aggregate_process: true } };

        const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
          document: policyConfigSO,
          fromVersion: 14,
          toVersion: 15,
        });

        const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

        expectConfigToHave(migratedPolicyConfig, 'advanced.events.aggregate_process', true);
      });
    });
  });

  const getConfig = (so: SavedObject<PackagePolicy>) =>
    so.attributes.inputs[0].config?.policy.value;

  const expectConfigToHave = (config: any, path: string, value: string | boolean) => {
    for (const os of ['windows', 'mac', 'linux']) {
      expect(config[os]).toHaveProperty(path, value);
    }
  };
});
