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
  injectedVars: Record<string, any>
): UICapabilities {
  const features: Feature[] = xpackMainPlugin.getFeatures();

  const featureCapabilities: UICapabilities[] = features.map(getCapabilitiesFromFeature);

  return mergeCapabilities(injectedVars.uiCapabilities || {}, ...featureCapabilities);
}

function getCapabilitiesFromFeature(feature: Feature): UICapabilities {
  const capabilities: UICapabilities = {
    navLinks: {},
    [feature.id]: {},
  };

  if (feature.navLinkId) {
    capabilities.navLinks[feature.navLinkId] = true;
  }

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

function mergeCapabilities(...allCapabilities: UICapabilities[]): UICapabilities {
  return allCapabilities.reduce(
    (acc, capabilities) => {
      const featureCapabilities = Object.keys(capabilities)
        .filter(key => key !== 'navLinks')
        .reduce((featureAcc, key) => {
          return {
            ...featureAcc,
            [key]: capabilities[key],
          };
        }, {});

      return {
        ...featureCapabilities,
        ...acc,
        navLinks: {
          ...capabilities.navLinks,
          ...acc.navLinks,
        },
      };
    },
    {
      navLinks: {},
    }
  );
}
