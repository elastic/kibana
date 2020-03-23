/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep, uniq } from 'lodash';
import { Feature, FeatureWithAllOrReadPrivileges, FeatureKibanaPrivileges } from '../common';
import { validateFeature } from './feature_schema';

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: FeatureWithAllOrReadPrivileges) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    validateFeature(feature);

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy: Feature = cloneDeep(feature as Feature);

    this.features[feature.id] = applyAutomaticPrivilegeGrants(featureCopy as Feature);
  }

  public getAll(): Feature[] {
    this.locked = true;
    return cloneDeep(Object.values(this.features));
  }
}

function applyAutomaticPrivilegeGrants(feature: Feature): Feature {
  const { all: allPrivilege, read: readPrivilege } = feature.privileges;
  const reservedPrivilege = feature.reserved ? feature.reserved.privilege : null;

  applyAutomaticAllPrivilegeGrants(allPrivilege, reservedPrivilege);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(...allPrivileges: Array<FeatureKibanaPrivileges | null>) {
  allPrivileges.forEach(allPrivilege => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | null>
) {
  readPrivileges.forEach(readPrivilege => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([...readPrivilege.savedObject.read, 'config', 'url']);
    }
  });
}
