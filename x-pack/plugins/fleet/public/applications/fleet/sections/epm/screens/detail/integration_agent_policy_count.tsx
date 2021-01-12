/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useGetPackageStats } from '../../../../hooks';

/**
 * Displays a count of Agent Policies that are using the given integration
 */
export const IntegrationAgentPolicyCount = memo<{ packageName: string }>(({ packageName }) => {
  const { data } = useGetPackageStats(packageName);

  return <>{data?.response.agent_policy_count ?? 0}</>;
});
