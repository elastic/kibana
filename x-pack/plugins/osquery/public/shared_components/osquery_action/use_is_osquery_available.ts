/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { find } from 'lodash';
import { useAgentDetails } from '../../agents/use_agent_details';
import { useAgentPolicy } from '../../agent_policies';
import { OSQUERY_INTEGRATION_NAME } from '../../../common';

export const useIsOsqueryAvailable = (agentId?: string) => {
  const {
    data: agentData,
    isFetched: agentFetched,
    isLoading,
  } = useAgentDetails({
    agentId,
    silent: true,
    skip: !agentId,
  });
  const {
    data: agentPolicyData,
    isFetched: policyFetched,
    isError: policyError,
    isLoading: policyLoading,
  } = useAgentPolicy({
    policyId: agentData?.policy_id,
    skip: !agentData,
    silent: true,
  });

  const osqueryAvailable = useMemo(() => {
    if (policyError) return false;

    const osqueryPackageInstalled = find(agentPolicyData?.package_policies, [
      'package.name',
      OSQUERY_INTEGRATION_NAME,
    ]);
    return osqueryPackageInstalled?.enabled;
  }, [agentPolicyData?.package_policies, policyError]);

  return { osqueryAvailable, agentFetched, isLoading, policyFetched, policyLoading, agentData };
};