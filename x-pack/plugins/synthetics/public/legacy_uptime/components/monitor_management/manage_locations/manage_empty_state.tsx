/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { PrivateLocation } from '../../../../../common/runtime_types';
import { EmptyLocations } from './empty_locations';
import { selectAgentPolicies } from '../../../state/private_locations';

export const ManageEmptyState: FC<{
  privateLocations: PrivateLocation[];
  hasFleetPermissions: boolean;
  setIsAddingNew: (val: boolean) => void;
}> = ({ children, privateLocations, setIsAddingNew, hasFleetPermissions }) => {
  const { data: agentPolicies } = useSelector(selectAgentPolicies);

  if (agentPolicies?.total === 0) {
    return <AgentPolicyNeeded />;
  }

  if (privateLocations.length === 0) {
    return <EmptyLocations setIsAddingNew={setIsAddingNew} disabled={!hasFleetPermissions} />;
  }

  return <>{children}</>;
};
