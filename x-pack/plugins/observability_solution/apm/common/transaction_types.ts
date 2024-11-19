/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRumAgentName, isMobileAgentName } from './agent_name';

const TRANSACTION_PAGE_LOAD = 'page-load';
const TRANSACTION_MOBILE = 'mobile';

export const TRANSACTION_REQUEST = 'request';

export const defaultTransactionTypes = [
  TRANSACTION_REQUEST,
  TRANSACTION_PAGE_LOAD,
  TRANSACTION_MOBILE,
];

export function getDefaultTransactionType(agentName?: string) {
  if (isRumAgentName(agentName)) {
    return TRANSACTION_PAGE_LOAD;
  }

  if (isMobileAgentName(agentName)) {
    return TRANSACTION_MOBILE;
  }

  return TRANSACTION_REQUEST;
}

export function isDefaultTransactionType(transactionType: string) {
  return defaultTransactionTypes.includes(transactionType);
}
