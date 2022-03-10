/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState, useMemo } from 'react';

import type { IncomingDataList } from '../../common/types/rest_spec/agent';

import { sendGetAgentIncomingData } from './index';

export const useGetAgentIncomingData = (agentsIds: string[]) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [incomingData, setIncomingData] = useState<IncomingDataList[]>([]);

  useEffect(() => {
    const getIncomingData = async () => {
      const { data } = await sendGetAgentIncomingData({ agentsIds });
      if (data?.items) {
        setIncomingData(data?.items);
        setIsLoading(false);
      }
    };
    if (agentsIds) {
      getIncomingData();
    }
  }, [agentsIds]);

  const enrolledAgents = useMemo(() => incomingData.length, [incomingData.length]);
  const agentsWithData = useMemo(
    () =>
      incomingData.reduce((acc, curr) => {
        const agentData = Object.values(curr)[0];
        return !!agentData.data ? acc + 1 : acc;
      }, 0),
    [incomingData]
  );

  return {
    enrolledAgents,
    agentsWithData,
    isLoading,
  };
};
