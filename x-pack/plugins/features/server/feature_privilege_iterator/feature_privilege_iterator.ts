/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '../';
import type { LicenseType } from '../../../licensing/server';
import { subFeaturePrivilegeIterator } from './sub_feature_privilege_iterator';

/**
 * Options to control feature privilege iteration.
 */
export interface FeaturePrivilegeIteratorOptions {
  /**
   * Augment each privilege definition with its sub-feature privileges.
   */
  augmentWithSubFeaturePrivileges: boolean;

  /**
   * The current license type. Controls which sub-features are returned, as they may have different license terms than the overall feature.
   */
  licenseType: LicenseType;

  /**
   * Optional predicate to filter the returned set of privileges.
   */
  predicate?: (privilegeId: string, privilege: FeatureKibanaPrivileges) => boolean;
}

/**
 * Utility for iterating through all privileges belonging to a specific feature.
 * Iteration can be customized in several ways:
 * - Filter privileges with a given predicate.
 * - Augment privileges with their respective sub-feature privileges.
 *
 * @param feature the feature whose privileges to iterate through.
 * @param options options to control iteration.
 */
export type FeaturePrivilegeIterator = (
  feature: KibanaFeature,
  options: FeaturePrivilegeIteratorOptions
) => IterableIterator<{ privilegeId: string; privilege: FeatureKibanaPrivileges }>;

const featurePrivilegeIterator: FeaturePrivilegeIterator = function* featurePrivilegeIterator(
  feature: KibanaFeature,
  options: FeaturePrivilegeIteratorOptions
) {
  for (const entry of Object.entries(feature.privileges ?? {})) {
    const [privilegeId, privilege] = entry;

    if (options.predicate && !options.predicate(privilegeId, privilege)) {
      continue;
    }

    if (options.augmentWithSubFeaturePrivileges) {
      yield {
        privilegeId,
        privilege: mergeWithSubFeatures(privilegeId, privilege, feature, options.licenseType),
      };
    } else {
      yield { privilegeId, privilege };
    }
  }
};

function mergeWithSubFeatures(
  privilegeId: string,
  privilege: FeatureKibanaPrivileges,
  feature: KibanaFeature,
  licenseType: LicenseType
) {
  const mergedConfig = _.cloneDeep(privilege);
  for (const subFeaturePrivilege of subFeaturePrivilegeIterator(feature, licenseType)) {
    if (subFeaturePrivilege.includeIn !== 'read' && subFeaturePrivilege.includeIn !== privilegeId) {
      continue;
    }

    mergedConfig.api = mergeArrays(mergedConfig.api, subFeaturePrivilege.api);

    mergedConfig.app = mergeArrays(mergedConfig.app, subFeaturePrivilege.app);

    mergedConfig.catalogue = mergeArrays(mergedConfig.catalogue, subFeaturePrivilege.catalogue);

    const managementEntries = Object.entries(mergedConfig.management ?? {});
    const subFeatureManagementEntries = Object.entries(subFeaturePrivilege.management ?? {});

    mergedConfig.management = [managementEntries, subFeatureManagementEntries]
      .flat()
      .reduce((acc, [sectionId, managementApps]) => {
        return {
          ...acc,
          [sectionId]: mergeArrays(acc[sectionId], managementApps),
        };
      }, {} as Record<string, string[]>);

    mergedConfig.ui = mergeArrays(mergedConfig.ui, subFeaturePrivilege.ui);

    mergedConfig.savedObject.all = mergeArrays(
      mergedConfig.savedObject.all,
      subFeaturePrivilege.savedObject.all
    );

    mergedConfig.savedObject.read = mergeArrays(
      mergedConfig.savedObject.read,
      subFeaturePrivilege.savedObject.read
    );

    mergedConfig.alerting = {
      rule: {
        all: mergeArrays(
          mergedConfig.alerting?.rule?.all ?? [],
          subFeaturePrivilege.alerting?.rule?.all ?? []
        ),
        read: mergeArrays(
          mergedConfig.alerting?.rule?.read ?? [],
          subFeaturePrivilege.alerting?.rule?.read ?? []
        ),
      },
      alert: {
        all: mergeArrays(
          mergedConfig.alerting?.alert?.all ?? [],
          subFeaturePrivilege.alerting?.alert?.all ?? []
        ),
        read: mergeArrays(
          mergedConfig.alerting?.alert?.read ?? [],
          subFeaturePrivilege.alerting?.alert?.read ?? []
        ),
      },
    };
  }
  return mergedConfig;
}

function mergeArrays(input1: readonly string[] | undefined, input2: readonly string[] | undefined) {
  const first = input1 ?? [];
  const second = input2 ?? [];
  return Array.from(new Set([...first, ...second]));
}

export { featurePrivilegeIterator };
