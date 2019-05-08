/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { UICapabilities } from 'ui/capabilities';
import { Feature } from '../../../xpack_main/types';
import { Space } from '../../common/model/space';
import {
  uiCapabilitiesGroupsFactory,
  UICapabilitiesGroup,
} from '../../../security/server/lib/authorization/ui_capabilities_groups';

export function toggleUICapabilities(
  features: Feature[],
  uiCapabilities: UICapabilities,
  activeSpace: Space
) {
  const uiCapabilitiesGroups = uiCapabilitiesGroupsFactory(null as any, features);
  const clonedCapabilities = _.cloneDeep(uiCapabilities);

  toggleDisabledFeatures(uiCapabilitiesGroups, features, clonedCapabilities, activeSpace);

  return clonedCapabilities;
}

function toggleDisabledFeatures(
  uiCapabilitiesGroups: UICapabilitiesGroup[],
  features: Feature[],
  uiCapabilities: UICapabilities,
  activeSpace: Space
) {
  const disabledFeatureIds: string[] = activeSpace.disabledFeatures;

  const disabledFeatures: Feature[] = disabledFeatureIds
    .map(key => features.find(feature => feature.id === key))
    .filter(feature => typeof feature !== 'undefined') as Feature[];

  for (const group of uiCapabilitiesGroups) {
    group.disableForFeatures(uiCapabilities, disabledFeatures);
  }
}
