/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, mergeWith, isArray, uniq } from 'lodash';
import type { KibanaFeatureConfig } from '@kbn/features-plugin/common';
import type { AppFeatureKibanaConfig, SubFeaturesPrivileges } from './types';

export function mergeAppFeatureConfigs(
  kibanaFeatureConfig: KibanaFeatureConfig,
  appFeaturesConfigs: AppFeatureKibanaConfig[]
): KibanaFeatureConfig {
  const mergedKibanaFeatureConfig = cloneDeep(kibanaFeatureConfig);
  const subFeaturesPrivilegesToMerge: SubFeaturesPrivileges[] = [];

  appFeaturesConfigs.forEach((appFeatureConfig) => {
    const { subFeaturesPrivileges, ...appFeatureConfigToMerge } = cloneDeep(appFeatureConfig);
    if (subFeaturesPrivileges) {
      subFeaturesPrivilegesToMerge.concat(subFeaturesPrivileges);
    }
    mergeFeatureConfig(mergedKibanaFeatureConfig, appFeatureConfigToMerge);
  });

  // add subFeaturePrivileges at the end to make sure all allowed subFeatures are merged
  subFeaturesPrivilegesToMerge.forEach((subFeaturesPrivileges) => {
    mergeSubFeaturesPrivileges(mergedKibanaFeatureConfig.subFeatures, subFeaturesPrivileges);
  });

  return mergedKibanaFeatureConfig;
}

function mergeFeatureConfig(
  kibanaFeatureConfig: KibanaFeatureConfig,
  appFeatureConfig: AppFeatureKibanaConfig
) {
  mergeWith(kibanaFeatureConfig, appFeatureConfig, featureConfigMerger);
}

function mergeSubFeaturesPrivileges(
  subFeatures: KibanaFeatureConfig['subFeatures'],
  subFeaturesPrivileges: SubFeaturesPrivileges
) {
  if (!subFeatures) {
    // TODO: warning "trying to merge subFeaturesPrivileges but no subFeatures found"
    return;
  }
  const merged = subFeatures.find(({ privilegeGroups }) =>
    privilegeGroups.some(({ privileges }) => {
      const subFeaturePrivilegeToUpdate = privileges.find(
        ({ id }) => id === subFeaturesPrivileges.id
      );
      if (subFeaturePrivilegeToUpdate) {
        mergeWith(subFeaturePrivilegeToUpdate, subFeaturesPrivileges, featureConfigMerger);
        return true;
      }
      return false;
    })
  );
  if (!merged) {
    // TODO: warning a "trying to merge subFeaturesPrivileges but the subFeature privilege was not found"
  }
}

function featureConfigMerger(objValue: unknown, srcValue: unknown) {
  if (isArray(srcValue)) {
    if (isArray(objValue)) {
      return uniq(objValue.concat(srcValue));
    }
    return srcValue;
  }
}
