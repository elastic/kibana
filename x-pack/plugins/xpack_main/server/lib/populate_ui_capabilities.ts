/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../types';

interface FeatureCapabilities {
  [featureId: string]: Record<string, boolean>;
}

export function populateUICapabilities(
  xpackMainPlugin: Record<string, any>,
  uiCapabilities: UICapabilities
): UICapabilities {
  const features: Feature[] = xpackMainPlugin.getFeatures();

  const featureCapabilities: FeatureCapabilities[] = features.map(getCapabilitiesFromFeature);

  return mergeCapabilities(uiCapabilities || {}, ...featureCapabilities);
}

function getCapabilitiesFromFeature(feature: Feature): FeatureCapabilities {
  const capabilities: FeatureCapabilities = {
    [feature.id]: {},
  };

  const featureCapabilities: Record<string, boolean> = Object.values(feature.privileges).reduce(
    (acc, privilege) => {
      return {
        ...acc,
        ...privilege.ui.reduce(
          (privilegeAcc, capabillity) => ({
            ...privilegeAcc,
            [capabillity]: true,
          }),
          {}
        ),
      };
    },
    {}
  );

  capabilities[feature.id] = featureCapabilities;

  return capabilities;
}

function mergeCapabilities(
  originalCapabilities: UICapabilities,
  ...allFeatureCapabilities: FeatureCapabilities[]
): UICapabilities {
  return allFeatureCapabilities.reduce<UICapabilities>((acc, capabilities) => {
    return {
      ...capabilities,
      ...acc,
    };
  }, originalCapabilities);
}
