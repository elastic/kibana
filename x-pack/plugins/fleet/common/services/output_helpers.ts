/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentPolicy } from '../types';
import { FLEET_APM_PACKAGE, FLEET_SERVER_PACKAGE, outputType } from '../constants';

/**
 * Return allowed output type for a given agent policy,
 * Fleet Server and APM cannot use anything else than same cluster ES
 */
export function getAllowedOutputTypeForPolicy(agentPolicy: AgentPolicy) {
  const isRestrictedToSameClusterES =
    agentPolicy.package_policies &&
    agentPolicy.package_policies.some(
      (p) => p.package?.name === FLEET_APM_PACKAGE || p.package?.name === FLEET_SERVER_PACKAGE
    );

  if (isRestrictedToSameClusterES) {
    return [outputType.Elasticsearch];
  }

  return Object.values(outputType);
}
