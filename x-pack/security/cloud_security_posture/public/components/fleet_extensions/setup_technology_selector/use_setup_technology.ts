/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';

import { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE } from '../../../../common/constants';

export const useSetupTechnology = ({
  input,
  agentPolicy,
  agentlessPolicy,
  handleSetupTechnologyChange,
  isEditPage,
}: {
  input: NewPackagePolicyInput;
  agentPolicy?: AgentPolicy;
  agentlessPolicy?: AgentPolicy;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
  isEditPage: boolean;
}) => {
  const isCspmAws = input.type === CLOUDBEAT_AWS;
  const isCspmGcp = input.type === CLOUDBEAT_GCP;
  const isCspmAzure = input.type === CLOUDBEAT_AZURE;
  const isAgentlessSupportedForCloudProvider = isCspmAws || isCspmGcp || isCspmAzure;
  const isAgentlessAvailable = Boolean(isAgentlessSupportedForCloudProvider && agentlessPolicy);
  const agentPolicyId = agentPolicy?.id;
  const agentlessPolicyId = agentlessPolicy?.id;
  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(() => {
    if (isEditPage && agentPolicyId === SetupTechnology.AGENTLESS) {
      return SetupTechnology.AGENTLESS;
    }

    return SetupTechnology.AGENT_BASED;
  });

  useEffect(() => {
    if (isEditPage) {
      return;
    }

    if (agentPolicyId && agentPolicyId !== agentlessPolicyId) {
      /*
        handle case when agent policy is coming from outside,
        e.g. from the get param or when coming to integration from a specific agent policy
      */
      setSetupTechnology(SetupTechnology.AGENT_BASED);
    } else if (isAgentlessAvailable) {
      /*
        preselecting agentless when available
        and resetting to agent-based when switching to another integration type, which doesn't support agentless
      */
      setSetupTechnology(SetupTechnology.AGENTLESS);
    } else {
      setSetupTechnology(SetupTechnology.AGENT_BASED);
    }
  }, [agentPolicyId, agentlessPolicyId, isAgentlessAvailable, isEditPage]);

  useEffect(() => {
    if (isEditPage) {
      return;
    }

    if (handleSetupTechnologyChange) {
      handleSetupTechnologyChange(setupTechnology);
    }
  }, [handleSetupTechnologyChange, isEditPage, setupTechnology]);

  return {
    isAgentlessAvailable,
    setupTechnology,
    setSetupTechnology,
  };
};
