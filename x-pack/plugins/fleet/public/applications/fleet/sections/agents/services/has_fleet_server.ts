/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy, PackagePolicy } from '../../../types';
import { FLEET_SERVER_PACKAGE } from '../../../constants';

export function policyHasFleetServer(agentPolicy: AgentPolicy) {
  return agentPolicy.package_policies?.some(
    (ap: string | PackagePolicy) =>
      typeof ap !== 'string' && ap.package?.name === FLEET_SERVER_PACKAGE
  );
}
