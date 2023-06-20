/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toClientContract = (attributes: SyntheticsPrivateLocationsAttributes) => {
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
