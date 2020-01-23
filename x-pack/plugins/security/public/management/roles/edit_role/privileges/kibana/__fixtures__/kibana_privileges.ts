/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { KibanaPrivileges, RawKibanaPrivileges } from '../../../../../../../common/model';
import { Feature } from '../../../../../../../../features/public';

function* subFeaturePrivilegeIterator(feature: Feature) {
  for (const subFeature of feature.subFeatures || []) {
    for (const group of subFeature.privilegeGroups) {
      yield* group.privileges;
    }
  }
}

const createRawKibanaPrivileges = (features: Feature[]) => {
  const raw: RawKibanaPrivileges = {
    global: {
      all: [],
      read: [],
    },
    space: {
      all: [],
      read: [],
    },
    features: {},
    reserved: {},
  };

  for (const feature of features) {
    if (!feature.privileges) continue;

    const primaryAllAction = `feature/${feature.id}/allAction`;
    const primaryReadAction = `feature/${feature.id}/readAction`;

    raw.features[feature.id] = {
      all: [primaryAllAction, primaryReadAction],
      minimal_all: [primaryAllAction, primaryReadAction],
      read: [primaryReadAction],
      minimal_read: [primaryReadAction],
    };

    for (const subFeaturePrivilege of subFeaturePrivilegeIterator(feature)) {
      const action = `feature/${feature.id}/subFeature/${subFeaturePrivilege.id}`;
      if (subFeaturePrivilege.includeIn === 'all') {
        raw.features[feature.id].all.push(action);
      }
      if (subFeaturePrivilege.includeIn === 'read') {
        raw.features[feature.id].read.push(action);
      }
      raw.features[feature.id][subFeaturePrivilege.id] = [action];
    }

    if (!feature.privileges.all.excludeFromBasePrivileges) {
      raw.global.all.push(...raw.features[feature.id].all);
      raw.space.all.push(...raw.features[feature.id].all);
    }
    if (!feature.privileges.read.excludeFromBasePrivileges) {
      raw.global.read.push(...raw.features[feature.id].read);
      raw.space.read.push(...raw.features[feature.id].read);
    }
  }

  return raw;
};

export const createKibanaPrivileges = (features: Feature[]) => {
  return new KibanaPrivileges(createRawKibanaPrivileges(features), features);
};
