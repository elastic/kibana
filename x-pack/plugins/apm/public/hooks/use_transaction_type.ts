/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getFirstTransactionType } from '../../common/agent_name';
import { useAgentName } from './useAgentName';
import { useServiceTransactionTypes } from './useServiceTransactionTypes';
import { useUrlParams } from './useUrlParams';

/**
 * Get either the transaction type from the URL parameters, "request"
 * (for non-RUM agents), "page-load" (for RUM agents) if this service uses them,
 * or the first available transaction type.
 */
export function useTransactionType() {
  const { agentName } = useAgentName();
  const { urlParams } = useUrlParams();
  const transactionTypeFromUrlParams = urlParams.transactionType;
  const transactionTypes = useServiceTransactionTypes(urlParams);
  const firstTransactionType = getFirstTransactionType(
    transactionTypes,
    agentName
  );

  return transactionTypeFromUrlParams ?? firstTransactionType;
}
