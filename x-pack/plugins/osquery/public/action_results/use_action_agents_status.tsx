/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useLayoutEffect, useMemo, useState } from 'react';
import { useActionResults } from './use_action_results';
import { Direction } from '../../common/search_strategy';

interface UseActionAgentStatusProps {
  actionId: string;
  agentIds?: string[];
  skip?: boolean;
  isLive?: boolean;
}

export const useActionAgentStatus = ({
  actionId,
  agentIds,
  skip,
  isLive,
}: UseActionAgentStatusProps) => {
  // console.error('agentss', agentIds);
  const [allAgentsResponded, setAllAgentsResponded] = useState(false);
  const {
    // @ts-expect-error update types
    data: { aggregations },
  } = useActionResults({
    actionId,
    activePage: 0,
    agentIds,
    limit: 0,
    direction: Direction.asc,
    sortField: '@timestamp',
    skip,
    isLive: isLive && !allAgentsResponded,
  });

  const agentStatus = useMemo(() => {
    const notRespondedCount = !agentIds?.length ? 0 : agentIds.length - aggregations.totalResponded;

    return {
      success: aggregations.successful,
      pending: notRespondedCount,
      failed: aggregations.failed,
      total: aggregations.totalResponded,
    };
  }, [agentIds?.length, aggregations.failed, aggregations.successful, aggregations.totalResponded]);

  useLayoutEffect(() => {
    if (!agentStatus.pending) {
      setAllAgentsResponded(true);
    }
  }, [agentStatus.pending]);

  // console.error('agentStatus', agentStatus);

  return agentStatus;
};
