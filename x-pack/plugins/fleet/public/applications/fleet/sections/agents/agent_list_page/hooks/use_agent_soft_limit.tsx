/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';

import { useConfig, sendGetAgents } from '../../../../hooks';

async function fetchTotalOnlineAgents() {
  const response = await sendGetAgents({
    kuery: 'status:online',
    perPage: 0,
    showInactive: false,
  });

  if (response.error) {
    throw new Error(response.error.message);
  }

  return response.data?.total ?? 0;
}

export function useAgentSoftLimit() {
  const config = useConfig();

  const softLimit = config.internal?.activeAgentsSoftLimit;

  const { data: totalAgents } = useQuery(['fetch-total-online-agents'], fetchTotalOnlineAgents, {
    enabled: softLimit !== undefined,
  });

  return {
    shouldDisplayAgentSoftLimit: softLimit && totalAgents ? totalAgents > softLimit : false,
  };
}
