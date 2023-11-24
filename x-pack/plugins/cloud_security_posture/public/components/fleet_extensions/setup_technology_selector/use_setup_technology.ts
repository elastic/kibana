/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo, useState } from 'react';

import { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS } from '../../../../common/constants';

export const useSetupTechnology = ({
  input,
  agentPolicy,
  agentlessPolicy,
  handleSetupTechnologyChange,
}: {
  input: NewPackagePolicyInput;
  agentPolicy?: AgentPolicy;
  agentlessPolicy?: AgentPolicy;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
}) => {
  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(
    SetupTechnology.AGENT_BASED
  );
  const isCspmAws = input.type === CLOUDBEAT_AWS;
  const isAgentlessAvailable = useMemo(
    () => Boolean(isCspmAws && agentlessPolicy),
    [isCspmAws, agentlessPolicy]
  );
  const agentPolicyId = useMemo(() => agentPolicy?.id, [agentPolicy]);
  const agentlessPolicyId = useMemo(() => agentlessPolicy?.id, [agentlessPolicy]);

  useEffect(() => {
    if (agentPolicyId && agentPolicyId !== agentlessPolicyId) {
      /*
        handle case when agent policy is coming from outside,
        e.g. from the get param or when coming to integration from a specific agent policy
      */
      setSetupTechnology(SetupTechnology.AGENT_BASED);
    } else if (isAgentlessAvailable) {
      /*
        preselecting agenteless when available
        and resetting to agent-based when switching to another integration type, which doesn't support agentless
      */
      setSetupTechnology(SetupTechnology.AGENTLESS);
    } else {
      setSetupTechnology(SetupTechnology.AGENT_BASED);
    }
  }, [agentPolicyId, agentlessPolicyId, isAgentlessAvailable]);

  useEffect(() => {
    if (handleSetupTechnologyChange) {
      handleSetupTechnologyChange(setupTechnology);
    }
  }, [handleSetupTechnologyChange, setupTechnology]);

  return {
    isAgentlessAvailable,
    setupTechnology,
    setSetupTechnology,
  };
};
