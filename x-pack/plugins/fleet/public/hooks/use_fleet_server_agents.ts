/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AGENTS_PREFIX,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../constants';

import { sendGetAgents, sendGetPackagePolicies } from './use_request';

export async function sendGetAllFleetServerAgents(onlyCount: boolean = false) {
  const packagePoliciesRes = await sendGetPackagePolicies({
    page: 1,
    perPage: SO_SEARCH_LIMIT,
    kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
  });
  const agentPolicyIds = [
    ...new Set(packagePoliciesRes?.data?.items.map((p) => p.policy_id) ?? []),
  ];

  if (agentPolicyIds.length === 0) {
    return { allFleetServerAgents: [] };
  }

  const kuery = `${AGENTS_PREFIX}.policy_id:(${agentPolicyIds
    .map((id) => `"${id}"`)
    .join(' or ')})`;

  const response = await sendGetAgents({
    kuery,
    perPage: onlyCount ? 0 : SO_SEARCH_LIMIT,
    showInactive: false,
  });

  return {
    allFleetServerAgents: response.data?.items || [],
    fleetServerAgentsCount: response.data?.total ?? 0,
  };
}
