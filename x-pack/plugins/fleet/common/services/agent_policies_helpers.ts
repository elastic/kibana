/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import { FLEET_SERVER_PACKAGE, FLEET_APM_PACKAGE } from '../constants';

export function policyHasFleetServer(agentPolicy: AgentPolicy) {
  if (!agentPolicy.package_policies) {
    return false;
  }
  return (
    agentPolicy.package_policies?.some((p) => p.package?.name === FLEET_SERVER_PACKAGE) ||
    !!agentPolicy.has_fleet_server
  );
}

export function policyHasAPMIntegration(agentPolicy: AgentPolicy) {
  if (!agentPolicy.package_policies) {
    return false;
  }
  return agentPolicy.package_policies?.some((p) => p.package?.name === FLEET_APM_PACKAGE);
}
