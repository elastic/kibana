/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertTypeState } from '../../../../../../alerting/server';
import { SecurityAlertTypeReturnValue } from '../types';

export const createResultObject = <TState extends AlertTypeState>(state: TState) => {
  const result: SecurityAlertTypeReturnValue<TState> = {
    bulkCreateTimes: [],
    createdSignalsCount: 0,
    createdSignals: [],
    errors: [],
    lastLookbackDate: undefined,
    searchAfterTimes: [],
    state,
    success: true,
    warning: false,
    warningMessages: [],
  };
  return result;
};

export * from './expand_dotted';
export * from './get_list_client';
