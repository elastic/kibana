/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { appContextService } from '..';
import type { FleetConfigType } from '../../config';

export const isAgentlessCloudEnabled = () => {
  const cloudSetup = appContextService.getCloud();
  return Boolean(cloudSetup?.isCloudEnabled && appContextService.getConfig()?.agentless?.enabled);
};
export const isAgentlessServerlessEnabled = () => {
  const cloudSetup = appContextService.getCloud();
  return Boolean(
    cloudSetup?.isServerlessEnabled && appContextService.getExperimentalFeatures().agentless
  );
};
export const isAgentlessEnabled = () => {
  return isAgentlessCloudEnabled() || isAgentlessServerlessEnabled();
};

const AGENTLESS_API_BASE_PATH = '/api/v1/ess';

type AgentlessApiEndpoints = '/deployments' | `/deployments/${string}`;

export const prependAgentlessApiBasePathToEndpoint = (
  agentlessConfig: FleetConfigType['agentless'],
  endpoint: AgentlessApiEndpoints
) => {
  return `${agentlessConfig.api.url}${AGENTLESS_API_BASE_PATH}${endpoint}`;
};
