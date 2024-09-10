/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, ReactNode } from 'react';
import { useHistory } from 'react-router-dom';
import { History } from 'history';
import { ApmDocumentType } from '../../../common/document_type';
import { getDefaultTransactionType } from '../../../common/transaction_types';
import { useServiceTransactionTypesFetcher } from './use_service_transaction_types_fetcher';
import { useServiceAgentFetcher } from './use_service_agent_fetcher';
import { useAnyOfApmParams } from '../../hooks/use_apm_params';
import { useTimeRange } from '../../hooks/use_time_range';
import { useFallbackToTransactionsFetcher } from '../../hooks/use_fallback_to_transactions_fetcher';
import { replace } from '../../components/shared/links/url_helpers';
import { FETCH_STATUS } from '../../hooks/use_fetcher';
import { ServerlessType } from '../../../common/serverless';
import { usePreferredDataSourceAndBucketSize } from '../../hooks/use_preferred_data_source_and_bucket_size';
import {
  type ServiceEntitySummary,
  useServiceEntitySummaryFetcher,
} from './use_service_entity_summary_fetcher';

export interface APMServiceContextValue {
  serviceName: string;
  agentName?: string;
  serverlessType?: ServerlessType;
  transactionType?: string;
  transactionTypeStatus: FETCH_STATUS;
  transactionTypes: string[];
  runtimeName?: string;
  fallbackToTransactions: boolean;
  serviceAgentStatus: FETCH_STATUS;
  serviceEntitySummary?: ServiceEntitySummary;
  serviceEntitySummaryStatus: FETCH_STATUS;
}

export const APMServiceContext = createContext<APMServiceContextValue>({
  serviceName: '',
  transactionTypeStatus: FETCH_STATUS.NOT_INITIATED,
  transactionTypes: [],
  fallbackToTransactions: false,
  serviceAgentStatus: FETCH_STATUS.NOT_INITIATED,
  serviceEntitySummaryStatus: FETCH_STATUS.NOT_INITIATED,
});

export function ApmServiceContextProvider({ children }: { children: ReactNode }) {
  const history = useHistory();

  const {
    path: { serviceName },
    query,
    query: { kuery, rangeFrom, rangeTo, environment },
  } = useAnyOfApmParams('/services/{serviceName}', '/mobile-services/{serviceName}');

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const {
    agentName,
    runtimeName,
    serverlessType,
    status: serviceAgentStatus,
  } = useServiceAgentFetcher({
    serviceName,
    start,
    end,
  });

  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery,
    type: ApmDocumentType.TransactionMetric,
    numBuckets: 100,
  });

  const { transactionTypes, status: transactionTypeStatus } = useServiceTransactionTypesFetcher({
    serviceName,
    start,
    end,
    documentType: preferred?.source.documentType,
    rollupInterval: preferred?.source.rollupInterval,
  });

  const { serviceEntitySummary, serviceEntitySummaryStatus } = useServiceEntitySummaryFetcher({
    serviceName,
    start,
    end,
    environment,
  });

  const currentTransactionType = getOrRedirectToTransactionType({
    transactionType: query.transactionType,
    transactionTypes,
    agentName,
    history,
  });

  const { fallbackToTransactions } = useFallbackToTransactionsFetcher({
    kuery,
  });

  return (
    <APMServiceContext.Provider
      value={{
        serviceName,
        agentName,
        serverlessType,
        transactionType: currentTransactionType,
        transactionTypeStatus,
        transactionTypes,
        runtimeName,
        fallbackToTransactions,
        serviceAgentStatus,
        serviceEntitySummary,
        serviceEntitySummaryStatus,
      }}
      children={children}
    />
  );
}

const isTypeExistsInTransactionTypesList = ({
  transactionType,
  transactionTypes,
}: {
  transactionType?: string;
  transactionTypes: string[];
}): boolean => !!transactionType && transactionTypes.includes(transactionType);

const isNoAgentAndNoTransactionTypes = ({
  transactionTypes,
  agentName,
}: {
  transactionTypes: string[];
  agentName?: string;
}): boolean => !agentName || transactionTypes.length === 0;

export function getTransactionType({
  transactionType,
  transactionTypes,
  agentName,
}: {
  transactionType?: string;
  transactionTypes: string[];
  agentName?: string;
}): string | undefined {
  const isTransactionTypeExists = isTypeExistsInTransactionTypesList({
    transactionType,
    transactionTypes,
  });

  if (isTransactionTypeExists) return transactionType;

  const isNoAgentAndNoTransactionTypesExists = isNoAgentAndNoTransactionTypes({
    transactionTypes,
    agentName,
  });

  if (isNoAgentAndNoTransactionTypesExists) return undefined;

  const defaultTransactionType = getDefaultTransactionType(agentName);

  // If the default transaction type is not in transactionTypes the first in the list is returned
  const currentTransactionType = transactionTypes.includes(defaultTransactionType)
    ? defaultTransactionType
    : transactionTypes[0];

  return currentTransactionType;
}

export function getOrRedirectToTransactionType({
  transactionType,
  transactionTypes,
  agentName,
  history,
}: {
  transactionType?: string;
  transactionTypes: string[];
  agentName?: string;
  history: History;
}) {
  const isTransactionTypeExists = isTypeExistsInTransactionTypesList({
    transactionType,
    transactionTypes,
  });

  if (isTransactionTypeExists) return transactionType;

  const isNoAgentAndNoTransactionTypesExists = isNoAgentAndNoTransactionTypes({
    transactionTypes,
    agentName,
  });

  if (isNoAgentAndNoTransactionTypesExists) return undefined;

  const currentTransactionType = getTransactionType({
    transactionTypes,
    transactionType,
    agentName,
  });

  // Replace transactionType in the URL in case it is not one of the types returned by the API
  replace(history, { query: { transactionType: currentTransactionType! } });

  return currentTransactionType;
}
