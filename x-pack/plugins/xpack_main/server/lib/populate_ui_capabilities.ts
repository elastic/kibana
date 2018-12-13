/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../types';

export function populateUICapabilities(
  xpackMainPlugin: Record<string, any>,
  uiCapabilities: UICapabilities
): UICapabilities {
  const features: Feature[] = xpackMainPlugin.getFeatures();

  const featureCapabilities: UICapabilities[] = features.map(getCapabilitiesFromFeature);

  return mergeCapabilities(uiCapabilities || {}, ...featureCapabilities);
}

function getCapabilitiesFromFeature(feature: Feature): UICapabilities {
  const capabilities: UICapabilities = {
    navLinks: {},
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
  ...allFeatureCapabilities: UICapabilities[]
): UICapabilities {
  return allFeatureCapabilities.reduce((acc, capabilities) => {
    return {
      ...capabilities,
      ...acc,
    };
  }, originalCapabilities);
}
