/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core-saved-objects-api-server';
import type { ModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { createModelVersionTestMigrator } from '@kbn/core-test-helpers-model-versions';
import { set } from '@kbn/safer-lodash-set';

import { getSavedObjectTypes } from '../..';

import type { PackagePolicy } from '../../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../../common';

describe('Defend integration advanced policy fields v8.16.0', () => {
  const TARGET_MODEL_VERSION = 15;

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

  /** Builds object key paths for all parent objects
   *
   * @param path e.g. `advanced.events.optionName`
   * @returns e.g. ['advanced', 'advanced.events']
   */
  const getParentObjectKeyPaths = (path: string): string[] =>
    path
      .split('.') // ['advanced', 'events', 'optionName']
      .slice(0, -1) // ['advanced', 'events']
      .map((parentObject) => path.match(`^.*${parentObject}`)![0]); // ['advanced', 'advanced.events']

  describe(`when updating to model version ${TARGET_MODEL_VERSION}`, () => {
    describe.each`
      name                               | path                                        | backfill
      ${'aggregate_process'}             | ${'advanced.events.aggregate_process'}      | ${false}
      ${'set_extended_host_information'} | ${'advanced.set_extended_host_information'} | ${true}
      ${'alerts.hash.md5'}               | ${'advanced.alerts.hash.md5'}               | ${true}
      ${'alerts.hash.sha1'}              | ${'advanced.alerts.hash.sha1'}              | ${true}
      ${'events.hash.md5'}               | ${'advanced.events.hash.md5'}               | ${true}
      ${'events.hash.sha1'}              | ${'advanced.events.hash.sha1'}              | ${true}
    `(
      'backfilling `$name` with `$backfill`',
      ({ path, backfill }: { path: string; backfill: boolean }) => {
        it('should backfill when there are no advanced options yet', () => {
          const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
            document: policyConfigSO,
            fromVersion: TARGET_MODEL_VERSION - 1,
            toVersion: TARGET_MODEL_VERSION,
          });

          const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

          expectConfigToHave(migratedPolicyConfig, path, backfill);
        });

        it.each(getParentObjectKeyPaths(path))(
          'should backfill without modifying other options in parent object `%s`',
          (parentObjectKeyPath) => {
            const policyConfig = getConfig(policyConfigSO);
            const dummyField = `${parentObjectKeyPath}.cheese`;
            set(policyConfig.windows, dummyField, 'brie');
            set(policyConfig.mac, dummyField, 'maasdam');
            set(policyConfig.linux, dummyField, 'camambert');

            const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
              document: policyConfigSO,
              fromVersion: TARGET_MODEL_VERSION - 1,
              toVersion: TARGET_MODEL_VERSION,
            });

            const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

            expectConfigToHave(migratedPolicyConfig, path, backfill);
            expect(migratedPolicyConfig.windows).toHaveProperty(dummyField, 'brie');
            expect(migratedPolicyConfig.mac).toHaveProperty(dummyField, 'maasdam');
            expect(migratedPolicyConfig.linux).toHaveProperty(dummyField, 'camambert');
          }
        );

        it('should not backfill if field is already present', () => {
          const policyConfig = getConfig(policyConfigSO);
          set(policyConfig.windows, path, !backfill);
          set(policyConfig.mac, path, !backfill);
          set(policyConfig.linux, path, !backfill);

          const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
            document: policyConfigSO,
            fromVersion: TARGET_MODEL_VERSION - 1,
            toVersion: TARGET_MODEL_VERSION,
          });

          const migratedPolicyConfig = getConfig(migratedPolicyConfigSO);

          expectConfigToHave(migratedPolicyConfig, path, !backfill);
        });
      }
    );
  });

  const getConfig = (so: SavedObject<PackagePolicy>) =>
    so.attributes.inputs[0].config?.policy.value;

  const expectConfigToHave = (config: any, path: string, value: string | boolean) => {
    for (const os of ['windows', 'mac', 'linux']) {
      expect(config[os]).toHaveProperty(path, value);
    }
  };
});
