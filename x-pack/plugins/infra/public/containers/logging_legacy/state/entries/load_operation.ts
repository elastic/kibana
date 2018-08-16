/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntries as LogEntriesQuery } from '../../../../../common/graphql/types';
import {
  createGraphqlOperationActionCreators,
  createGraphqlOperationReducer,
  createGraphqlQueryEpic,
} from '../../../../utils/remote_state/remote_graphql_state';
import { logEntriesQuery } from './log_entries.gql_query';
import { initialEntriesGraphqlState } from './state';

const operationKey = 'load';

export const loadEntriesActionCreators = createGraphqlOperationActionCreators<
  LogEntriesQuery.Query,
  LogEntriesQuery.Variables
>('entries', operationKey);

export const loadEntriesReducer = createGraphqlOperationReducer(
  operationKey,
  initialEntriesGraphqlState,
  loadEntriesActionCreators,
  (state, action) => action.payload.result.data.source.logEntriesAround
);

export const loadEntriesEpic = createGraphqlQueryEpic(logEntriesQuery, loadEntriesActionCreators);
