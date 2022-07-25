/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import type { DeploymentMode } from '../steps';

import { useFleetServerHost } from './use_fleet_server_host';
import { useSelectFleetServerPolicy } from './use_select_fleet_server_policy';
import { useServiceToken } from './use_service_token';
import { useWaitForFleetServer } from './use_wait_for_fleet_server';

/**
 * Provides all data/state required for the "advanced" tab in the Fleet Server instructions/flyout
 */
export const useAdvancedForm = (defaultAgentPolicyId?: string) => {
  const {
    eligibleFleetServerPolicies,
    refreshEligibleFleetServerPolicies,
    fleetServerPolicyId,
    setFleetServerPolicyId,
  } = useSelectFleetServerPolicy(defaultAgentPolicyId);
  const { isFleetServerReady } = useWaitForFleetServer();
  const { serviceToken, isLoadingServiceToken, generateServiceToken } = useServiceToken();
  const fleetServerHostForm = useFleetServerHost();

  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>('quickstart');

  return {
    eligibleFleetServerPolicies,
    refreshEligibleFleetServerPolicies,
    fleetServerPolicyId,
    setFleetServerPolicyId,
    isFleetServerReady,
    serviceToken,
    isLoadingServiceToken,
    generateServiceToken,
    fleetServerHostForm,
    deploymentMode,
    setDeploymentMode,
  };
};
