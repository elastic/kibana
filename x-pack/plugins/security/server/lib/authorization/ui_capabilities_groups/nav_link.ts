/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { UICapabilitiesGroup } from './ui_capabilities_group';
import { Feature } from '../../../../../xpack_main/types';

export class NavLinkUICapabilitiesGroup implements UICapabilitiesGroup {
  private readonly featureNavLinkIds: string[];

  constructor(features: Feature[]) {
    this.featureNavLinkIds = features
      .map(feature => feature.navLinkId)
      .filter(navLinkId => navLinkId != null) as string[];
  }

  disable(uiCapabilties: UICapabilities) {
    for (const navLinkId of Object.keys(uiCapabilties.navLinks)) {
      // If there's a navLink that isn't for a feature which we recognize, we don't disable it.
      // This provides a better experience for plugins which add nav links but aren't registered
      // as features and they will always be displayed.
      if (this.featureNavLinkIds.includes(navLinkId)) {
        uiCapabilties.navLinks[navLinkId] = false;
      }
    }
  }
}
