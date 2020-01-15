/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, uniq } from 'lodash';
import { Feature, FeatureKibanaPrivileges, IFeature } from '../common';
import { validateFeature } from './feature_schema';

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: IFeature) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    try {
      validateFeature(feature);
    } catch (e) {
      console.error(`TODO: Ignoring invalid feature: ${feature.id}`);
      if (feature.id === 'discover') throw e;
      return;
    }

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy: IFeature = cloneDeep(feature as IFeature);

    this.features[feature.id] = new Feature(applyAutomaticPrivilegeGrants(featureCopy as IFeature));
  }

  public getAll(): Feature[] {
    this.locked = true;
    return Object.values(this.features);
  }
}

function applyAutomaticPrivilegeGrants(feature: IFeature): IFeature {
  const allPrivilege = feature.privileges ? feature.privileges[0] : null;
  const readPrivilege = feature.privileges ? feature.privileges[1] : null;
  const reservedPrivilege = feature.reserved ? feature.reserved.privilege : null;

  applyAutomaticAllPrivilegeGrants(allPrivilege, reservedPrivilege);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(
  ...allPrivileges: Array<FeatureKibanaPrivileges | null | undefined>
) {
  allPrivileges.forEach(allPrivilege => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | null | undefined>
) {
  readPrivileges.forEach(readPrivilege => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([...readPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}
