/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode } from 'react';
import { isRumAgentName } from '../../../common/agent_name';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { useServiceTransactionTypesFetcher } from './use_service_transaction_types_fetcher';
import { useServiceAgentFetcher } from './use_service_agent_fetcher';
import { useApmParams } from '../../hooks/use_apm_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useFallbackToTransactionsFetcher } from '../../hooks/use_fallback_to_transactions_fetcher';

export interface APMServiceContextValue {
  serviceName: string;
  agentName?: string;
  transactionType?: string;
  transactionTypes: string[];
  runtimeName?: string;
  fallbackToTransactions: boolean;
}

export const APMServiceContext = createContext<APMServiceContextValue>({
  serviceName: '',
  transactionTypes: [],
  fallbackToTransactions: false,
});

export function ApmServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    path: { serviceName },
    query,
    query: { kuery, rangeFrom, rangeTo },
  } = useApmParams('/services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { agentName, runtimeName } = useServiceAgentFetcher({
    serviceName,
    start,
    end,
  });

  const transactionTypes = useServiceTransactionTypesFetcher({
    serviceName,
    start,
    end,
  });

  const transactionType = getTransactionType({
    transactionType: query.transactionType,
    transactionTypes,
    agentName,
  });

  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  return (
    <APMServiceContext.Provider
      value={{
        serviceName,
        agentName,
        transactionType,
        transactionTypes,
        runtimeName,
        fallbackToTransactions,
      }}
      children={children}
    />
  );
}

export function getTransactionType({
  transactionType,
  transactionTypes,
  agentName,
}: {
  transactionType?: string;
  transactionTypes: string[];
  agentName?: string;
}) {
  if (transactionType) {
    return transactionType;
  }

  if (!agentName || transactionTypes.length === 0) {
    return;
  }

  // The default transaction type is "page-load" for RUM agents and "request" for all others
  const defaultTransactionType = isRumAgentName(agentName)
    ? TRANSACTION_PAGE_LOAD
    : TRANSACTION_REQUEST;

  // If the default transaction type is not in transactionTypes the first in the list is returned
  return transactionTypes.includes(defaultTransactionType)
    ? defaultTransactionType
    : transactionTypes[0];
}
