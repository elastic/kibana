/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UICapabilitiesGroup } from './ui_capabilities_group';
import { NavLinkUICapabilitiesGroup } from './nav_link';
import { Feature } from '../../../../../xpack_main/types';
import { FeatureUICapabilitiesGroup } from './feature';
import { ManagementCapabilitiesGroup } from './management';
import { CatalogueUICapabilitiesGroup } from './catalogue';
export { UICapabilitiesGroup };

export function uiCapabilitiesGroupsFactory(features: Feature[]): UICapabilitiesGroup[] {
  return [
    new CatalogueUICapabilitiesGroup(),
    new NavLinkUICapabilitiesGroup(features),
    new ManagementCapabilitiesGroup(),
    ...features.map(feature => new FeatureUICapabilitiesGroup(feature)),
  ];
}
