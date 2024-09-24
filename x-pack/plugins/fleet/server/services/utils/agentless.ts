/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';
import type { FleetConfigType } from '../../config';

export const isAgentlessApiEnabled = () => {
  const cloudSetup = appContextService.getCloud();
  const isHosted = cloudSetup?.isCloudEnabled || cloudSetup?.isServerlessEnabled;
  return Boolean(isHosted && appContextService.getConfig()?.agentless?.enabled);
};
export const isDefaultAgentlessPolicyEnabled = () => {
  const cloudSetup = appContextService.getCloud();
  return Boolean(
    cloudSetup?.isServerlessEnabled && appContextService.getExperimentalFeatures().agentless
  );
};
export const isAgentlessEnabled = () => {
  return isAgentlessApiEnabled() || isDefaultAgentlessPolicyEnabled();
};

const AGENTLESS_ESS_API_BASE_PATH = '/api/v1/ess';
const AGENTLESS_SERVERLESS_API_BASE_PATH = '/api/v1/serverless';

type AgentlessApiEndpoints = '/deployments' | `/deployments/${string}`;

export const prependAgentlessApiBasePathToEndpoint = (
  agentlessConfig: FleetConfigType['agentless'],
  endpoint: AgentlessApiEndpoints
) => {
  const cloudSetup = appContextService.getCloud();
  const endpointPrefix = cloudSetup?.isServerlessEnabled
    ? AGENTLESS_SERVERLESS_API_BASE_PATH
    : AGENTLESS_ESS_API_BASE_PATH;
  return `${agentlessConfig.api.url}${endpointPrefix}${endpoint}`;
};
