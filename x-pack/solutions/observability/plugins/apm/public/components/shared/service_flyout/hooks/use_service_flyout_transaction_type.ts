/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import { ApmDocumentType } from '../../../../../common/document_type';
import { getDefaultTransactionType } from '../../../../../common/transaction_types';
import { getTransactionType } from '../../../../context/apm_service/apm_service_context';
import { useServiceTransactionTypesFetcher } from '../../../../context/apm_service/use_service_transaction_types_fetcher';
import type { FETCH_STATUS } from '../../../../hooks/use_fetcher';
import { isPending } from '../../../../hooks/use_fetcher';
import { usePreferredDataSourceAndBucketSize } from '../../../../hooks/use_preferred_data_source_and_bucket_size';
import { TARGET_BUCKET_COUNT } from '../overview/chart_configs/shared';

interface Params {
  serviceName: string;
  agentName?: string;
  start: string;
  end: string;
  transactionType: string;
  setTransactionType?: (transactionType: string) => void;
}

interface Result {
  transactionTypes: string[];
  status: FETCH_STATUS;
  selectedTransactionType?: string;
  /**
   * Whether the charts can be queried: while the transaction types are in flight there is nothing to
   * filter on yet, and an unfiltered query would report every transaction type of the service.
   */
  isResolved: boolean;
}

/**
 * Resolves the transaction type the flyout charts and the transaction type picker share, from the
 * same rollups the APM service overview page reads.
 */
export function useServiceFlyoutTransactionType({
  serviceName,
  agentName,
  start,
  end,
  transactionType,
  setTransactionType,
}: Params): Result {
  const preferred = usePreferredDataSourceAndBucketSize({
    start,
    end,
    kuery: '',
    type: ApmDocumentType.TransactionMetric,
    numBuckets: TARGET_BUCKET_COUNT,
  });

  const { transactionTypes, status } = useServiceTransactionTypesFetcher({
    serviceName,
    start,
    end,
    documentType: preferred?.source.documentType,
    rollupInterval: preferred?.source.rollupInterval,
  });

  const selectedTransactionType = useMemo(() => {
    const resolved = getTransactionType({ transactionType, transactionTypes, agentName });
    if (resolved || transactionTypes.length === 0) {
      return resolved;
    }
    // Callers such as the service map hand over nodes without an agent name, which makes the shared
    // helper bail out even though the service does report transaction types.
    const defaultTransactionType = getDefaultTransactionType(agentName);
    return transactionTypes.includes(defaultTransactionType)
      ? defaultTransactionType
      : transactionTypes[0];
  }, [agentName, transactionType, transactionTypes]);

  useEffect(() => {
    if (
      setTransactionType &&
      selectedTransactionType !== undefined &&
      selectedTransactionType !== transactionType
    ) {
      setTransactionType(selectedTransactionType);
    }
  }, [setTransactionType, selectedTransactionType, transactionType]);

  return {
    transactionTypes,
    status,
    selectedTransactionType,
    isResolved: !isPending(status),
  };
}
