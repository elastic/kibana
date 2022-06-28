/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, uniq } from 'lodash';
import { ILicense } from '@kbn/licensing-plugin/server';
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

  public getAllKibanaFeatures(license?: ILicense, ignoreLicense = false): KibanaFeature[] {
    this.locked = true;
    let features = Object.values(this.kibanaFeatures);

    const performLicenseCheck = license && !ignoreLicense;

    if (performLicenseCheck) {
      features = features.filter((feature) => {
        const filter = !feature.minimumLicense || license!.hasAtLeast(feature.minimumLicense);
        if (!filter) return false;

        feature.subFeatures?.forEach((subFeature) => {
          subFeature.privilegeGroups.forEach((group) => {
            group.privileges = group.privileges.filter(
              (privilege) =>
                !privilege.minimumLicense || license!.hasAtLeast(privilege.minimumLicense)
            );
          });
        });

        return true;
      });
    }
    return features.map((featureConfig) => new KibanaFeature(featureConfig));
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
