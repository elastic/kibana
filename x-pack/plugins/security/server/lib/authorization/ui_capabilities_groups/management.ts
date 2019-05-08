/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../../xpack_main/types';
import { UICapabilitiesGroup } from './ui_capabilities_group';
import { Actions } from '../actions';
import { CheckPrivilegesAtResourceResponse } from '../check_privileges';

export class ManagementCapabilitiesGroup implements UICapabilitiesGroup {
  constructor(private actions: Actions) {}

  disable(uiCapabilities: UICapabilities) {
    for (const section of Object.keys(uiCapabilities.management)) {
      for (const capability of Object.keys(uiCapabilities.management[section])) {
        uiCapabilities.management[section][capability] = false;
      }
    }
  }

  disableForFeatures(uiCapabilities: UICapabilities, features: Feature[]) {
    for (const feature of features) {
      if (feature.management) {
        for (const section of Object.keys(feature.management)) {
          for (const capability of feature.management[section]) {
            uiCapabilities.management[section][capability] = false;
          }
        }
      }
    }
  }

  disableUsingPrivileges(
    uiCapabilities: UICapabilities,
    checkPrivilegesResponse: CheckPrivilegesAtResourceResponse
  ) {
    for (const section of Object.keys(uiCapabilities.management)) {
      for (const capability of Object.keys(uiCapabilities.management[section])) {
        if (
          checkPrivilegesResponse.privileges[
            this.actions.ui.get('management', section, capability)
          ] === false
        ) {
          uiCapabilities.management[section][capability] = false;
        }
      }
    }
  }

  getActions(uiCapabilities: UICapabilities) {
    const actions: string[] = [];
    for (const section of Object.keys(uiCapabilities.management)) {
      for (const capability of Object.keys(uiCapabilities.management[section])) {
        actions.push(this.actions.ui.get('management', section, capability));
      }
    }
    return actions;
  }
}
