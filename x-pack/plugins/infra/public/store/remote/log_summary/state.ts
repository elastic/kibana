/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogSummary as LogSummaryQuery } from '../../../../common/graphql/types';
import {
  createGraphqlInitialState,
  GraphqlState,
} from '../../../utils/remote_state/remote_graphql_state';

export type LogSummaryRemoteState = LogSummaryQuery.LogSummaryBetween;
export type LogSummaryState = GraphqlState<LogSummaryRemoteState>;

export const initialLogSummaryState: LogSummaryState = createGraphqlInitialState<
  LogSummaryRemoteState
>();
