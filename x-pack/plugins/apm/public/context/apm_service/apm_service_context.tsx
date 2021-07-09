/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode } from 'react';
import { ValuesType } from 'utility-types';
import { isRumAgentName } from '../../../common/agent_name';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { useServiceTransactionTypesFetcher } from './use_service_transaction_types_fetcher';
import { useServiceAgentNameFetcher } from './use_service_agent_name_fetcher';
import { APIReturnType } from '../../services/rest/createCallApmApi';
import { useServiceAlertsFetcher } from './use_service_alerts_fetcher';
import { useApmParams } from '../../hooks/use_apm_params';

export type APMServiceAlert = ValuesType<
  APIReturnType<'GET /api/apm/services/{serviceName}/alerts'>['alerts']
>;

export const APMServiceContext = createContext<{
  serviceName: string;
  agentName?: string;
  transactionType?: string;
  transactionTypes: string[];
  alerts: APMServiceAlert[];
}>({ serviceName: '', transactionTypes: [], alerts: [] });

export function ApmServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const {
    path: { serviceName },
    query,
  } = useApmParams('/services/:serviceName');

  const { agentName } = useServiceAgentNameFetcher(serviceName);

  const transactionTypes = useServiceTransactionTypesFetcher(serviceName);

  const transactionType = getTransactionType({
    transactionType: query.transactionType,
    transactionTypes,
    agentName,
  });

  const { alerts } = useServiceAlertsFetcher({ serviceName, transactionType });

  return (
    <APMServiceContext.Provider
      value={{
        serviceName,
        agentName,
        transactionType,
        transactionTypes,
        alerts,
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
