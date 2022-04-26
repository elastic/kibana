/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { useGetAgentPolicies } from '../../../hooks';
import { policyHasFleetServer } from '../../../services';

export const useSelectFleetServerPolicy = (defaultAgentPolicyId?: string) => {
  const [fleetServerPolicyId, setFleetServerPolicyId] = useState<string | undefined>(
    defaultAgentPolicyId
  );
  const { data: agentPoliciesData, resendRequest } = useGetAgentPolicies({
    full: true,
  });

  const eligibleFleetServerPolicies = useMemo(
    () =>
      agentPoliciesData
        ? agentPoliciesData.items?.filter((item) => policyHasFleetServer(item))
        : [],
    [agentPoliciesData]
  );

  useEffect(() => {
    // Default to the first policy found with a fleet server integration installed
    if (eligibleFleetServerPolicies.length && !fleetServerPolicyId) {
      setFleetServerPolicyId(eligibleFleetServerPolicies[0].id);
    }
  }, [eligibleFleetServerPolicies, fleetServerPolicyId]);

  return {
    fleetServerPolicyId,
    setFleetServerPolicyId,
    eligibleFleetServerPolicies,
    refreshEligibleFleetServerPolicies: resendRequest,
  };
};
