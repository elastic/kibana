/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { useGetEnrollmentSettings } from '../../../hooks';

export const useSelectFleetServerPolicy = (defaultAgentPolicyId?: string) => {
  const [fleetServerPolicyId, setFleetServerPolicyId] = useState<string | undefined>(
    defaultAgentPolicyId
  );
  const { isLoading, isInitialRequest, data, resendRequest } = useGetEnrollmentSettings();

  useEffect(() => {
    // Default to the first policy found with a fleet server integration installed
    if (data?.fleet_server?.agent_policies.length === 1 && !fleetServerPolicyId) {
      setFleetServerPolicyId(data?.fleet_server?.agent_policies[0].id);
    }
  }, [data?.fleet_server, fleetServerPolicyId]);

  return {
    isSelectFleetServerPolicyLoading: isLoading && isInitialRequest,
    fleetServerPolicyId,
    setFleetServerPolicyId,
    eligibleFleetServerPolicies: data?.fleet_server?.agent_policies || [],
    refreshEligibleFleetServerPolicies: resendRequest,
  };
};
