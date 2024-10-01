/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExperimentalFeaturesService } from '../services';
import type { AgentPolicy, NewPackagePolicy, PackageInfo } from '../types';

import { AGENTLESS_POLICY_ID } from '../../common/constants';
import { isAgentlessIntegration as isAgentlessIntegrationFn } from '../../common/services/agentless_helper';

import { useConfig } from './use_config';
import { useStartServices } from './use_core';

export const useAgentless = () => {
  const config = useConfig();
  const { agentless: agentlessExperimentalFeatureEnabled } = ExperimentalFeaturesService.get();
  const { cloud } = useStartServices();
  const isServerless = !!cloud?.isServerlessEnabled;
  const isCloud = !!cloud?.isCloudEnabled;

  const isAgentlessApiEnabled = (isCloud || isServerless) && config.agentless?.enabled;
  const isDefaultAgentlessPolicyEnabled =
    !isAgentlessApiEnabled && isServerless && agentlessExperimentalFeatureEnabled;

  const isAgentlessEnabled = isAgentlessApiEnabled || isDefaultAgentlessPolicyEnabled;

  const isAgentlessAgentPolicy = (agentPolicy: AgentPolicy | undefined) => {
    if (!agentPolicy) return false;
    return (
      isAgentlessEnabled &&
      (agentPolicy?.id === AGENTLESS_POLICY_ID || !!agentPolicy?.supports_agentless)
    );
  };

  // When an integration has at least a policy template enabled for agentless
  const isAgentlessIntegration = (packageInfo: PackageInfo | undefined) => {
    return isAgentlessEnabled && isAgentlessIntegrationFn(packageInfo);
  };

  // TODO: remove this check when CSPM implements the above flag and rely only on `isAgentlessIntegration`
  const isAgentlessPackagePolicy = (packagePolicy: NewPackagePolicy) => {
    return isAgentlessEnabled && packagePolicy.policy_ids.includes(AGENTLESS_POLICY_ID);
  };

  return {
    isAgentlessApiEnabled,
    isDefaultAgentlessPolicyEnabled,
    isAgentlessEnabled,
    isAgentlessAgentPolicy,
    isAgentlessIntegration,
    isAgentlessPackagePolicy,
  };
};
