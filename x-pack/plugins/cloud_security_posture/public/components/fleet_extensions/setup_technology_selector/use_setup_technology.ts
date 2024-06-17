/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';

import { NewPackagePolicyInput } from '@kbn/fleet-plugin/common';
import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { CLOUDBEAT_AWS, CLOUDBEAT_GCP, CLOUDBEAT_AZURE } from '../../../../common/constants';

export const useSetupTechnology = ({
  input,
  // agentPolicy,
  isAgentlessEnabled,
  // agentlessPolicy,
  handleSetupTechnologyChange,
  isEditPage,
}: {
  input: NewPackagePolicyInput;
  // agentPolicy?: AgentPolicy;
  // agentlessPolicy?: AgentPolicy;
  isAgentlessEnabled: boolean;
  handleSetupTechnologyChange?: (value: SetupTechnology) => void;
  isEditPage: boolean;
}) => {
  const isCspmAws = input.type === CLOUDBEAT_AWS;
  const isCspmGcp = input.type === CLOUDBEAT_GCP;
  const isCspmAzure = input.type === CLOUDBEAT_AZURE;
  const isAgentlessSupportedForCloudProvider = isCspmAws || isCspmGcp || isCspmAzure;
  const isAgentlessAvailable = Boolean(isAgentlessSupportedForCloudProvider && isAgentlessEnabled);
  // const agentPolicyId = agentPolicy?.id;
  // const agentlessPolicyId = agentlessPolicy?.id;
  const [setupTechnology, setSetupTechnology] = useState<SetupTechnology>(() => {
    if (isEditPage && isAgentlessAvailable) {
      return SetupTechnology.AGENTLESS;
    }

    return SetupTechnology.AGENT_BASED;
  });

  const [isDirty, setIsDirty] = useState<boolean>(false);

  const updateSetupTechnology = (value: SetupTechnology) => {
    setSetupTechnology(value);
    setIsDirty(true);
  };

  useEffect(() => {
    if (isEditPage || isDirty) {
      return;
    }

    if (!isAgentlessAvailable) {
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
  }, [isAgentlessAvailable, isDirty, isEditPage]);

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
    updateSetupTechnology,
  };
};
