/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrivateLocation, SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationConfiguration,
} from '../../../runtime_types/private_locations';

export const toClientContract = (
  attributes: SyntheticsPrivateLocationsAttributes
): SyntheticsPrivateLocations => {
  return {
    locations: attributes.locations.map((location) => ({
      label: location.label,
      id: location.id,
      agentPolicyId: location.agentPolicyId,
      concurrentMonitors: location.concurrentMonitors,
      isServiceManaged: location.isServiceManaged,
      isInvalid: location.isInvalid,
      tags: location.tags,
      geo: {
        lat: location.geo?.lat ? Number(location.geo.lat) : null,
        lon: location.geo?.lon ? Number(location.geo.lon) : null,
      },
    })),
  };
};

export const toSavedObjectContract = (location: PrivateLocation): PrivateLocationConfiguration => {
  return {
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    concurrentMonitors: location.concurrentMonitors,
    isServiceManaged: location.isServiceManaged,
    isInvalid: location.isInvalid,
    tags: location.tags,
    geo: {
      // to do: change 0 to null
      lat: location.geo?.lat ? location.geo.lat : 0,
      lon: location.geo?.lon ? location.geo.lon : 0,
    },
  };
};
