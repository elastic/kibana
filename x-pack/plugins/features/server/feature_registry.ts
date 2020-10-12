/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, uniq } from 'lodash';
import {
  KibanaFeatureConfig,
  KibanaFeature,
  FeatureKibanaPrivileges,
  ElasticsearchFeatureConfig,
  ElasticsearchFeature,
} from '../common';
import { validateKibanaFeature, validateElasticsearchFeature } from './feature_schema';

export class FeatureRegistry {
  private locked = false;
  private kibanaFeatures: Record<string, KibanaFeatureConfig> = {};
  private esFeatures: Record<string, ElasticsearchFeatureConfig> = {};

  public registerKibanaFeature(feature: KibanaFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    validateKibanaFeature(feature);

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy = cloneDeep(feature);

    this.kibanaFeatures[feature.id] = applyAutomaticPrivilegeGrants(featureCopy);
  }

  public registerElasticsearchFeature(feature: ElasticsearchFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    validateElasticsearchFeature(feature);

    const featureCopy = cloneDeep(feature);

    this.esFeatures[feature.id] = featureCopy;
  }

  public getAllKibanaFeatures(): KibanaFeature[] {
    this.locked = true;
    return Object.values(this.kibanaFeatures).map(
      (featureConfig) => new KibanaFeature(featureConfig)
    );
  }

  public getAllElasticsearchFeatures(): ElasticsearchFeature[] {
    this.locked = true;
    return Object.values(this.esFeatures).map(
      (featureConfig) => new ElasticsearchFeature(featureConfig)
    );
  }
}

function applyAutomaticPrivilegeGrants(feature: KibanaFeatureConfig): KibanaFeatureConfig {
  const allPrivilege = feature.privileges?.all;
  const readPrivilege = feature.privileges?.read;
  const reservedPrivileges = (feature.reserved?.privileges ?? []).map((rp) => rp.privilege);

  applyAutomaticAllPrivilegeGrants(allPrivilege, ...reservedPrivileges);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(
  ...allPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  allPrivileges.forEach((allPrivilege) => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  readPrivileges.forEach((readPrivilege) => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([
        ...readPrivilege.savedObject.read,
        'config',
        'telemetry',
        'url',
      ]);
    }
  });
}
