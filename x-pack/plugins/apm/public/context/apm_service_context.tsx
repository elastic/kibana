/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { createContext, ReactNode } from 'react';
import { isRumAgentName } from '../../common/agent_name';
import {
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_REQUEST,
} from '../../common/transaction_types';
import { useServiceTransactionTypes } from '../hooks/use_service_transaction_types';
import { useUrlParams } from '../hooks/useUrlParams';
import { useServiceAgentName } from '../hooks/use_service_agent_name';
import { IUrlParams } from './UrlParamsContext/types';

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
  const { agentName } = useServiceAgentName();
  const transactionTypes = useServiceTransactionTypes();
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
