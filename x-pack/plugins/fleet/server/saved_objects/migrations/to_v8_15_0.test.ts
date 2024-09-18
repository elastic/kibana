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

import type { SavedObject } from '@kbn/core-saved-objects-server';

import type { PackagePolicy } from '../../../common';
import { PACKAGE_POLICY_SAVED_OBJECT_TYPE } from '../../../common';
import { getSavedObjectTypes } from '..';

const getPolicyDoc = (packageName: string): SavedObject<PackagePolicy> => {
  return {
    id: 'mock-saved-object-id',
    attributes: {
      name: 'Some Policy Name',
      package: {
        name: packageName,
        title: '',
        version: '',
      },
      id: 'package-policy-1',
      policy_id: 'agent-policy-1',
      policy_ids: [],
      enabled: true,
      namespace: '',
      revision: 0,
      updated_at: '',
      updated_by: '',
      created_at: '',
      created_by: '',
      inputs: [],
    },
    type: PACKAGE_POLICY_SAVED_OBJECT_TYPE,
    references: [],
  };
};

describe('8.15.0 Requires Root Package Policy migration', () => {
  let migrator: ModelVersionTestMigrator;

  beforeEach(() => {
    migrator = createModelVersionTestMigrator({
      type: getSavedObjectTypes()[PACKAGE_POLICY_SAVED_OBJECT_TYPE],
    });
  });

  describe('backfilling `requires_root`', () => {
    it('should backfill `requires_root` field as `true` for `endpoint` package on Kibana update', () => {
      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: getPolicyDoc('endpoint'),
        fromVersion: 10,
        toVersion: 11,
      });

      expect(migratedPolicyConfigSO.attributes.package?.requires_root).toBe(true);
    });

    it('should backfill `requires_root` field as `true` for `auditd_manager` package on Kibana update', () => {
      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: getPolicyDoc('auditd_manager'),
        fromVersion: 10,
        toVersion: 11,
      });

      expect(migratedPolicyConfigSO.attributes.package?.requires_root).toBe(true);
    });

    it('should not backfill `requires_root` field as `true` for other package on Kibana update', () => {
      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: getPolicyDoc('other'),
        fromVersion: 10,
        toVersion: 11,
      });

      expect(migratedPolicyConfigSO.attributes.package!.requires_root).toBe(undefined);
    });
  });

  describe('backfilling `policy_ids`', () => {
    it('should backfill `policy_ids` field as `[policy_id]` on Kibana update', () => {
      const migratedPolicyConfigSO = migrator.migrate<PackagePolicy, PackagePolicy>({
        document: getPolicyDoc('endpoint'),
        fromVersion: 11,
        toVersion: 12,
      });

      expect(migratedPolicyConfigSO.attributes.policy_ids).toEqual(['agent-policy-1']);
    });
  });
});
