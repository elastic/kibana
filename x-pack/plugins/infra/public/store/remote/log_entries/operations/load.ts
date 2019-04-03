/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntries as LogEntriesQuery } from '../../../../graphql/types';
import {
  createGraphqlOperationActionCreators,
  createGraphqlOperationReducer,
  createGraphqlQueryEpic,
} from '../../../../utils/remote_state/remote_graphql_state';
import { initialLogEntriesState } from '../state';
import { logEntriesQuery } from './log_entries.gql_query';

const operationKey = 'load';

export const loadEntriesActionCreators = createGraphqlOperationActionCreators<
  LogEntriesQuery.Query,
  LogEntriesQuery.Variables
>('log_entries', operationKey);

export const loadEntriesReducer = createGraphqlOperationReducer(
  operationKey,
  initialLogEntriesState,
  loadEntriesActionCreators,
  (state, action) => action.payload.result.data.source.logEntriesAround,
  () => ({
    entries: [],
    hasMoreAfter: false,
    hasMoreBefore: false,
  })
);

export const loadEntriesEpic = createGraphqlQueryEpic(logEntriesQuery, loadEntriesActionCreators);
