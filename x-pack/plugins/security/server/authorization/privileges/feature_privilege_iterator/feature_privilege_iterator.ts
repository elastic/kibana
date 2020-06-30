/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Feature, FeatureKibanaPrivileges } from '../../../../../features/server';
import { subFeaturePrivilegeIterator } from './sub_feature_privilege_iterator';

interface IteratorOptions {
  augmentWithSubFeaturePrivileges: boolean;
  predicate?: (privilegeId: string, privilege: FeatureKibanaPrivileges) => boolean;
}

export function* featurePrivilegeIterator(
  feature: Feature,
  options: IteratorOptions
): IterableIterator<{ privilegeId: string; privilege: FeatureKibanaPrivileges }> {
  for (const entry of Object.entries(feature.privileges ?? {})) {
    const [privilegeId, privilege] = entry;

    if (options.predicate && !options.predicate(privilegeId, privilege)) {
      continue;
    }

    if (options.augmentWithSubFeaturePrivileges) {
      yield { privilegeId, privilege: mergeWithSubFeatures(privilegeId, privilege, feature) };
    } else {
      yield { privilegeId, privilege };
    }
  }
}

function mergeWithSubFeatures(
  privilegeId: string,
  privilege: FeatureKibanaPrivileges,
  feature: Feature
) {
  const mergedConfig = _.cloneDeep(privilege);
  for (const subFeaturePrivilege of subFeaturePrivilegeIterator(feature)) {
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
  }
  return mergedConfig;
}

function mergeArrays(input1: readonly string[] | undefined, input2: readonly string[] | undefined) {
  const first = input1 ?? [];
  const second = input2 ?? [];
  return Array.from(new Set([...first, ...second]));
}
