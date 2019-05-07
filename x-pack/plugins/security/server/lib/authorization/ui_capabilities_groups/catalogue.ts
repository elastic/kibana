/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilities } from 'ui/capabilities';
import { UICapabilitiesGroup } from './ui_capabilities_group';

export class CatalogueUICapabilitiesGroup implements UICapabilitiesGroup {
  constructor() {}

  disable(uiCapabilities: UICapabilities) {
    for (const capability of Object.keys(uiCapabilities.catalogue)) {
      uiCapabilities.catalogue[capability] = false;
    }
  }
}
