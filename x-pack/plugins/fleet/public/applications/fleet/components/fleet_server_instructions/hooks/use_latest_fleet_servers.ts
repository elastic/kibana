/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState, useEffect } from 'react';

import {
  AGENTS_PREFIX,
  FLEET_SERVER_PACKAGE,
  PACKAGE_POLICY_SAVED_OBJECT_TYPE,
  SO_SEARCH_LIMIT,
} from '../../../constants';

import { sendGetAgents, sendGetPackagePolicies } from '../../../hooks';

const POLLING_INTERVAL_MS = 10 * 1000; // 10 secs

export const useLatestFleetServers = (opts?: any) => {
  const [agentIds, setAgentIds] = useState<string[]>([]);
  const timeout = useRef<number | undefined>(undefined);

  const getNewAgentIds = useCallback(async () => {
    const packagePoliciesRes = await sendGetPackagePolicies({
      page: 1,
      perPage: SO_SEARCH_LIMIT,
      kuery: `${PACKAGE_POLICY_SAVED_OBJECT_TYPE}.package.name:${FLEET_SERVER_PACKAGE}`,
    });

    const agentPolicyIds = [
      ...new Set(packagePoliciesRes?.data?.items.map((p) => p.policy_id) ?? []),
    ];

    if (agentPolicyIds.length === 0) {
      return;
    }

    const kuery = `(${agentPolicyIds
      .map((policyId) => `${AGENTS_PREFIX}.policy_id:"${policyId}"`)
      .join(
        ' or '
      )}) and not (_exists_:"${AGENTS_PREFIX}.unenrolled_at") and ${AGENTS_PREFIX}.enrolled_at >= now-10m`;

    const request = await sendGetAgents({
      kuery,
      showInactive: false,
    });

    const newAgentIds = request.data?.items.map((i) => i.id) ?? agentIds;
    if (newAgentIds.some((id) => !agentIds.includes(id))) {
      setAgentIds(newAgentIds);
    }
  }, [agentIds]);

  useEffect(() => {
    let isAborted = false;

    const poll = () => {
      timeout.current = window.setTimeout(async () => {
        getNewAgentIds();
        if (!isAborted) {
          poll();
        }
      }, POLLING_INTERVAL_MS);
    };

    poll();

    if (isAborted || agentIds.length > 0) clearTimeout(timeout.current);

    return () => {
      isAborted = true;
    };
  }, [agentIds, getNewAgentIds]);

  return { hasRecentlyEnrolledFleetServers: agentIds.length > 0 };
};
