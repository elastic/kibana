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
  try {
    for (const entry of Object.entries(feature.privileges || {})) {
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
  } catch (e) {
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
    console.error('ERROR ITERATING OVER FEATURE ' + feature.id + ': ' + e);
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

    mergedConfig.api = mergedConfig.api && [
      ...mergedConfig.api,
      ...(subFeaturePrivilege.api || []),
    ];

    mergedConfig.app = mergedConfig.app && [
      ...mergedConfig.app,
      ...(subFeaturePrivilege.app || []),
    ];

    mergedConfig.catalogue = mergedConfig.catalogue && [
      ...mergedConfig.catalogue,
      ...(subFeaturePrivilege.catalogue || []),
    ];

    mergedConfig.management =
      mergedConfig.management && _.merge(mergedConfig.management, subFeaturePrivilege.management);

    mergedConfig.ui = mergedConfig.ui && [...mergedConfig.ui, ...subFeaturePrivilege.ui];

    mergedConfig.savedObject.all = [
      ...mergedConfig.savedObject.all,
      ...subFeaturePrivilege.savedObject.all,
    ];

    mergedConfig.savedObject.read = [
      ...mergedConfig.savedObject.read,
      ...subFeaturePrivilege.savedObject.read,
    ];
  }
  return mergedConfig;
}
