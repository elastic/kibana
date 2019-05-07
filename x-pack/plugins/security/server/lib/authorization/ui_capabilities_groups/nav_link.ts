/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { UICapabilitiesGroup } from './ui_capabilities_group';
import { Feature } from '../../../../../xpack_main/types';
import { Actions } from '../actions';
import { CheckPrivilegesAtResourceResponse } from '../check_privileges';

// If there's a navLink that isn't for a feature which we recognize, we don't disable it.
// This provides a better experience for plugins which add nav links but aren't registered
// as features and they will always be displayed.
export class NavLinkUICapabilitiesGroup implements UICapabilitiesGroup {
  private readonly featureNavLinkIds: string[];

  constructor(private actions: Actions, features: Feature[]) {
    this.featureNavLinkIds = features
      .map(feature => feature.navLinkId)
      .filter(navLinkId => navLinkId != null) as string[];
  }

  disable(uiCapabilities: UICapabilities) {
    for (const navLinkId of Object.keys(uiCapabilities.navLinks)) {
      if (this.featureNavLinkIds.includes(navLinkId)) {
        uiCapabilities.navLinks[navLinkId] = false;
      }
    }
  }

  disableUsingPrivileges(
    uiCapabilities: UICapabilities,
    checkPrivilegesResponse: CheckPrivilegesAtResourceResponse
  ) {
    for (const navLinkId of Object.keys(uiCapabilities.navLinks)) {
      if (
        this.featureNavLinkIds.includes(navLinkId) &&
        checkPrivilegesResponse.privileges[this.actions.ui.get('navLinks', navLinkId)] === false
      ) {
        uiCapabilities.navLinks[navLinkId] = false;
      }
    }
  }

  getActions(uiCapabilities: UICapabilities) {
    const actions: string[] = [];
    for (const navLinkId of Object.keys(uiCapabilities.navLinks)) {
      if (this.featureNavLinkIds.includes(navLinkId)) {
        actions.push(this.actions.ui.get('navLinks', navLinkId));
      }
    }
    return actions;
  }
}
