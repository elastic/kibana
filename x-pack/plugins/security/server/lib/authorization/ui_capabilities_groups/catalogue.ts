/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { UICapabilitiesGroup } from './ui_capabilities_group';
import { Actions } from '../actions';
import { CheckPrivilegesAtResourceResponse } from '../check_privileges';

export class CatalogueUICapabilitiesGroup implements UICapabilitiesGroup {
  constructor(private actions: Actions) {}

  disable(uiCapabilities: UICapabilities) {
    for (const catalogueId of Object.keys(uiCapabilities.catalogue)) {
      uiCapabilities.catalogue[catalogueId] = false;
    }
  }

  disableUsingPrivileges(
    uiCapabilities: UICapabilities,
    checkPrivilegesResponse: CheckPrivilegesAtResourceResponse
  ) {
    for (const catalogueId of Object.keys(uiCapabilities.catalogue)) {
      if (
        checkPrivilegesResponse.privileges[this.actions.ui.get('catalogue', catalogueId)] === false
      ) {
        uiCapabilities.catalogue[catalogueId] = false;
      }
    }
  }

  getActions(uiCapabilities: UICapabilities) {
    return Object.keys(uiCapabilities.catalogue).map(catalogueId =>
      this.actions.ui.get('catalogue', catalogueId)
    );
  }
}
