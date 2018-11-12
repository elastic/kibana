/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Space } from '../../common/model/space';
import { SpacesClient } from './spaces_client';

export async function toggleUiCapabilities(
  uiCapabilities: UICapabilities,
  activeSpace: Space,
  spacesClient: SpacesClient
) {
  // 1) Determine if user can manage spaces
  await toggleManageSpacesCapability(uiCapabilities, spacesClient);

  // 2) Turn off capabilities that are disabled within this space
  toggleDisabledFeatures(uiCapabilities, activeSpace);

  return uiCapabilities;
}

async function toggleManageSpacesCapability(
  uiCapabilities: UICapabilities,
  spacesClient: SpacesClient
) {
  // Spaces special case
  // Security is normally responsible for toggling such features, but since Spaces themselves are part of a security construct,
  // the Spaces plugin is responsible for determining this specific capability.
  try {
    const canManageSpaces = await spacesClient.canEnumerateSpaces();
    if (!canManageSpaces) {
      uiCapabilities.spaces.manage = false;
    }
  } catch (error) {
    // TODO: Log
    // Fail closed.
    uiCapabilities.spaces.manage = false;
  }
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
