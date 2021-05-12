/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';

import type { FeatureKibanaPrivileges, KibanaFeature } from '../../../../../features/server';
import type { LicenseType } from '../../../../../licensing/server';
import { subFeaturePrivilegeIterator } from './sub_feature_privilege_iterator';

interface IteratorOptions {
  augmentWithSubFeaturePrivileges: boolean;
  licenseType: LicenseType;
  predicate?: (privilegeId: string, privilege: FeatureKibanaPrivileges) => boolean;
}

export function* featurePrivilegeIterator(
  feature: KibanaFeature,
  options: IteratorOptions
): IterableIterator<{ privilegeId: string; privilege: FeatureKibanaPrivileges }> {
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
}

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

    let all: string[] = [];
    let read: string[] = [];
    if (Array.isArray(mergedConfig.alerting?.all)) {
      all = mergedConfig.alerting?.all ?? [];
    } else {
      const allObject = mergedConfig.alerting?.all as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = allObject?.rule ?? [];
      const alert = allObject?.alert ?? [];
      all = [...rule, ...alert];
    }

    if (Array.isArray(mergedConfig.alerting?.read)) {
      read = mergedConfig.alerting?.read ?? [];
    } else {
      const readObject = mergedConfig.alerting?.read as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = readObject?.rule ?? [];
      const alert = readObject?.alert ?? [];
      read = [...rule, ...alert];
    }

    let subfeatureAll: string[] = [];
    let subfeatureRead: string[] = [];
    if (Array.isArray(subFeaturePrivilege.alerting?.all)) {
      subfeatureAll = subFeaturePrivilege.alerting?.all ?? [];
    } else {
      const allObject = subFeaturePrivilege.alerting?.all as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = allObject?.rule ?? [];
      const alert = allObject?.alert ?? [];
      subfeatureAll = [...rule, ...alert];
    }

    if (Array.isArray(subFeaturePrivilege.alerting?.read)) {
      subfeatureRead = subFeaturePrivilege.alerting?.read ?? [];
    } else {
      const readObject = subFeaturePrivilege.alerting?.read as {
        rule?: readonly string[];
        alert?: readonly string[];
      };
      const rule = readObject?.rule ?? [];
      const alert = readObject?.alert ?? [];
      subfeatureRead = [...rule, ...alert];
    }

    mergedConfig.alerting = {
      all: mergeArrays(all ?? [], subfeatureAll ?? []),
      read: mergeArrays(read ?? [], subfeatureRead ?? []),
    };
  }
  return mergedConfig;
}

function mergeArrays(input1: readonly string[] | undefined, input2: readonly string[] | undefined) {
  const first = input1 ?? [];
  const second = input2 ?? [];
  return Array.from(new Set([...first, ...second]));
}
