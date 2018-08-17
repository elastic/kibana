/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogSummary as LogSummaryQuery } from '../../../../common/graphql/types';
import {
  createGraphqlOperationActionCreators,
  createGraphqlOperationReducer,
  createGraphqlQueryEpic,
} from '../../../utils/remote_state/remote_graphql_state';
import { logSummaryQuery } from './log_summary.gql_query';
import { initialSummaryGraphqlState } from './state';

const operationKey = 'load';

export const loadSummaryActionCreators = createGraphqlOperationActionCreators<
  LogSummaryQuery.Query,
  LogSummaryQuery.Variables
>('summary', operationKey);

export const loadSummaryReducer = createGraphqlOperationReducer(
  operationKey,
  initialSummaryGraphqlState,
  loadSummaryActionCreators,
  (state, action) => action.payload.result.data.source.logSummaryBetween
);

export const loadSummaryEpic = createGraphqlQueryEpic(logSummaryQuery, loadSummaryActionCreators);
