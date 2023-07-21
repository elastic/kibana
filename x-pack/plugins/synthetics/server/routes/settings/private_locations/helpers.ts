/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { AgentPolicy } from '@kbn/fleet-plugin/common';
import type { SyntheticsPrivateLocations } from '../../../../common/runtime_types';
import type {
  SyntheticsPrivateLocationsAttributes,
  PrivateLocationAttributes,
} from '../../../runtime_types/private_locations';
import { PrivateLocation } from '../../../../common/runtime_types';

export const toClientContract = (
  attributes: SyntheticsPrivateLocationsAttributes,
  agentPolicies?: AgentPolicy[]
): SyntheticsPrivateLocations => {
  return {
    locations: attributes.locations.map((location) => ({
      label: location.label,
      id: location.id,
      agentPolicyId: location.agentPolicyId,
      concurrentMonitors: location.concurrentMonitors,
      isServiceManaged: false,
      isInvalid: !Boolean(agentPolicies?.find((policy) => policy.id === location.agentPolicyId)),
      tags: location.tags,
      geo: location.geo,
    })),
  };
};

export const toSavedObjectContract = (location: PrivateLocation): PrivateLocationAttributes => {
  return {
    label: location.label,
    id: location.id,
    agentPolicyId: location.agentPolicyId,
    concurrentMonitors: location.concurrentMonitors,
    tags: location.tags,
    isServiceManaged: false,
    geo: location.geo,
  };
};
