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
import { Actions } from '../actions';
export { UICapabilitiesGroup };

export function uiCapabilitiesGroupsFactory(
  actions: Actions,
  features: Feature[]
): UICapabilitiesGroup[] {
  return [
    new CatalogueUICapabilitiesGroup(actions),
    new NavLinkUICapabilitiesGroup(actions, features),
    new ManagementCapabilitiesGroup(actions),
    ...features.map(feature => new FeatureUICapabilitiesGroup(actions, feature)),
  ];
}
