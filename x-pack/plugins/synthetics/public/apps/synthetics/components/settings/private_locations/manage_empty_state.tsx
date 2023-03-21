/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { useSelector } from 'react-redux';
import { PrivateLocation } from '../../../../../../common/runtime_types';
import { AgentPolicyNeeded } from './agent_policy_needed';
import { EmptyLocations } from './empty_locations';
import { selectAgentPolicies } from '../../../state/private_locations';

export const ManageEmptyState: FC<{
  privateLocations: PrivateLocation[];
  hasFleetPermissions: boolean;
  setIsAddingNew?: (val: boolean) => void;
  showNeedAgentPolicy?: boolean;
  showEmptyLocations?: boolean;
}> = ({
  children,
  privateLocations,
  setIsAddingNew,
  hasFleetPermissions,
  showNeedAgentPolicy = true,
  showEmptyLocations = true,
}) => {
  const { data: agentPolicies } = useSelector(selectAgentPolicies);

  if (agentPolicies?.total === 0 && showNeedAgentPolicy) {
    return <AgentPolicyNeeded disabled={!hasFleetPermissions} />;
  }

  if (privateLocations.length === 0 && showEmptyLocations) {
    return <EmptyLocations setIsAddingNew={setIsAddingNew} disabled={!hasFleetPermissions} />;
  }

  return <>{children}</>;
};
