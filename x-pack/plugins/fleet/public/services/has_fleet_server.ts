/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FLEET_SERVER_PACKAGE } from '../constants';
import type { AgentPolicy, PackagePolicy } from '../types';

export function policyHasFleetServer(agentPolicy: AgentPolicy) {
  if (!agentPolicy.package_policies) {
    return false;
  }

  return agentPolicy.package_policies.some(
    (ap: PackagePolicy) => ap.package?.name === FLEET_SERVER_PACKAGE
  );
}
