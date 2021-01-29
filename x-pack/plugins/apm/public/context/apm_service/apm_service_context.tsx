/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, ReactNode } from 'react';
import { isRumAgentName } from '../../../common/agent_name';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../../common/transaction_types';
import { useServiceTransactionTypesFetcher } from './use_service_transaction_types_fetcher';
import { useUrlParams } from '../url_params_context/use_url_params';
import { useServiceAgentNameFetcher } from './use_service_agent_name_fetcher';
import { IUrlParams } from '../url_params_context/types';

export const APMServiceContext = createContext<{
  agentName?: string;
  transactionType?: string;
  transactionTypes: string[];
}>({ transactionTypes: [] });

export function ApmServiceContextProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { urlParams } = useUrlParams();
  const { agentName } = useServiceAgentNameFetcher();
  const transactionTypes = useServiceTransactionTypesFetcher();
  const transactionType = getTransactionType({
    urlParams,
    transactionTypes,
    agentName,
  });

  return (
    <APMServiceContext.Provider
      value={{ agentName, transactionType, transactionTypes }}
      children={children}
    />
  );
}

export function getTransactionType({
  urlParams,
  transactionTypes,
  agentName,
}: {
  urlParams: IUrlParams;
  transactionTypes: string[];
  agentName?: string;
}) {
  if (urlParams.transactionType) {
    return urlParams.transactionType;
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
