/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../query_keys';
import { useWorkChatServices } from './use_workchat_service';

export const useAgentList = () => {
  const { agentService } = useWorkChatServices();

  const {
    data: agents,
    isLoading,
    refetch: refresh,
  } = useQuery({
    queryKey: queryKeys.agents.list,
    queryFn: async () => {
      return agentService.list();
    },
    initialData: () => [],
  });

  return {
    agents,
    isLoading,
    refresh,
  };
};
