/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Space } from '../../common/model/space';

export async function toggleUiCapabilities(uiCapabilities: UICapabilities, activeSpace: Space) {
  toggleDisabledFeatures(uiCapabilities, activeSpace);

  return uiCapabilities;
}

function toggleDisabledFeatures(uiCapabilities: UICapabilities, activeSpace: Space) {
  // TODO: get disabled features from active space
  // @ts-ignore
  const disabledFeatures: string[] = activeSpace.disabledFeatures || [];

  const navLinks: Record<string, boolean> = uiCapabilities.navLinks as Record<string, boolean>;

  for (const feature of disabledFeatures) {
    // Disable associated navLink, if one exists
    if (uiCapabilities.navLinks.hasOwnProperty(feature)) {
      navLinks[feature] = false;
    }

    // Disable "sub features" that match the disabled feature
    if (uiCapabilities.hasOwnProperty(feature)) {
      const capability = uiCapabilities[feature];
      Object.keys(capability).forEach(featureKey => {
        capability[featureKey] = false;
      });
    }
  }
}
