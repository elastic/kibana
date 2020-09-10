/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { Feature } from '../common/feature';

const ELIGIBLE_FLAT_MERGE_KEYS = ['catalogue'] as const;

interface FeatureCapabilities {
  [featureId: string]: Record<string, boolean>;
}

export function uiCapabilitiesForFeatures(features: Feature[]): UICapabilities {
  const featureCapabilities: FeatureCapabilities[] = features.map(getCapabilitiesFromFeature);

  return buildCapabilities(...featureCapabilities);
}

function getCapabilitiesFromFeature(feature: Feature): FeatureCapabilities {
  const UIFeatureCapabilities: FeatureCapabilities = {
    catalogue: {},
    [feature.id]: {},
  };

  if (feature.catalogue) {
    UIFeatureCapabilities.catalogue = {
      ...UIFeatureCapabilities.catalogue,
      ...feature.catalogue.reduce(
        (acc, capability) => ({
          ...acc,
          [capability]: true,
        }),
        {}
      ),
    };
  }

  const featurePrivileges = Object.values(feature.privileges ?? {});
  if (feature.subFeatures) {
    featurePrivileges.push(
      ...feature.subFeatures.map((sf) => sf.privilegeGroups.map((pg) => pg.privileges)).flat(2)
    );
  }
  if (feature.reserved?.privileges) {
    featurePrivileges.push(...feature.reserved.privileges.map((rp) => rp.privilege));
  }

  featurePrivileges.forEach((privilege) => {
    UIFeatureCapabilities[feature.id] = {
      ...UIFeatureCapabilities[feature.id],
      ...privilege.ui.reduce(
        (privilegeAcc, capability) => ({
          ...privilegeAcc,
          [capability]: true,
        }),
        {}
      ),
    };
  });

  return UIFeatureCapabilities;
}

function buildCapabilities(...allFeatureCapabilities: FeatureCapabilities[]): UICapabilities {
  return allFeatureCapabilities.reduce<UICapabilities>((acc, capabilities) => {
    const mergableCapabilities = _.omit(capabilities, ...ELIGIBLE_FLAT_MERGE_KEYS);

    const mergedFeatureCapabilities = {
      ...mergableCapabilities,
      ...acc,
    };

    ELIGIBLE_FLAT_MERGE_KEYS.forEach((key) => {
      mergedFeatureCapabilities[key] = {
        ...mergedFeatureCapabilities[key],
        ...capabilities[key],
      };
    });

    return mergedFeatureCapabilities;
  }, {} as UICapabilities);
}
