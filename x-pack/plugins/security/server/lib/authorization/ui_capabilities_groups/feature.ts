/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../../../xpack_main/types';
import { UICapabilitiesGroup } from '.';
import { Actions } from '../actions';
import { CheckPrivilegesAtResourceResponse } from '../check_privileges';

export class FeatureUICapabilitiesGroup implements UICapabilitiesGroup {
  constructor(private actions: Actions, private feature: Feature) {}

  disable(uiCapabilities: UICapabilities) {
    const featureCapabilities = uiCapabilities[this.feature.id];
    if (featureCapabilities == null) {
      return;
    }

    for (const capabilityId of Object.keys(featureCapabilities)) {
      if (typeof featureCapabilities[capabilityId] === 'boolean') {
        featureCapabilities[capabilityId] = false;
        continue;
      }

      for (const subCapabilityId of Object.keys(featureCapabilities[capabilityId])) {
        (featureCapabilities[capabilityId] as Record<string, boolean>)[subCapabilityId] = false;
      }
    }
  }

  disableUsingPrivileges(
    uiCapabilities: UICapabilities,
    checkPrivilegesResponse: CheckPrivilegesAtResourceResponse
  ) {
    const featureCapabilities = uiCapabilities[this.feature.id];
    if (featureCapabilities == null) {
      return;
    }

    for (const capabilityId of Object.keys(featureCapabilities)) {
      if (typeof featureCapabilities[capabilityId] === 'boolean') {
        if (
          checkPrivilegesResponse.privileges[this.actions.ui.get(this.feature.id, capabilityId)] ===
          false
        ) {
          featureCapabilities[capabilityId] = false;
        }
        continue;
      }

      for (const subCapabilityId of Object.keys(featureCapabilities[capabilityId])) {
        if (
          checkPrivilegesResponse.privileges[
            this.actions.ui.get(this.feature.id, capabilityId, subCapabilityId)
          ] === false
        ) {
          (featureCapabilities[capabilityId] as Record<string, boolean>)[subCapabilityId] = false;
        }
      }
    }
  }

  getActions(uiCapabilities: UICapabilities) {
    const actions: string[] = [];
    const featureCapabilities = uiCapabilities[this.feature.id];
    if (featureCapabilities == null) {
      return actions;
    }

    for (const capabilityId of Object.keys(featureCapabilities)) {
      if (typeof featureCapabilities[capabilityId] === 'boolean') {
        actions.push(this.actions.ui.get(this.feature.id, capabilityId));
        continue;
      }

      for (const subCapabilityId of Object.keys(featureCapabilities[capabilityId])) {
        actions.push(this.actions.ui.get(this.feature.id, capabilityId, subCapabilityId));
      }
    }
    return actions;
  }
}
