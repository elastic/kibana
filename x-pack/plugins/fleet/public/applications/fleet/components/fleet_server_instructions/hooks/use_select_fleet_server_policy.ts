/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useGetFleetServerPolicyStatus } from '../../../hooks';

export const useSelectFleetServerPolicy = (defaultAgentPolicyId?: string) => {
  const [fleetServerPolicyId, setFleetServerPolicyId] = useState<string | undefined>(
    defaultAgentPolicyId
  );
  const {
    isLoading,
    isInitialRequest,
    data: fleetServerPolicyStatus = {
      agent_policies: [],
      has_active_fleet_server: false,
    },
    resendRequest,
  } = useGetFleetServerPolicyStatus();

  useEffect(() => {
    // Default to the first policy found with a fleet server integration installed
    if (fleetServerPolicyStatus?.agent_policies.length === 1 && !fleetServerPolicyId) {
      setFleetServerPolicyId(fleetServerPolicyStatus?.agent_policies[0].id);
    }
  }, [fleetServerPolicyStatus, fleetServerPolicyId]);

  return {
    isSelectFleetServerPolicyLoading: isLoading && isInitialRequest,
    fleetServerPolicyId,
    setFleetServerPolicyId,
    eligibleFleetServerPolicies: fleetServerPolicyStatus?.agent_policies,
    refreshEligibleFleetServerPolicies: resendRequest,
  };
};
