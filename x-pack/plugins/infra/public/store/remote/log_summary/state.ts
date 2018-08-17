/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogSummary as LogSummaryQuery } from '../../../../common/graphql/types';
import { createGraphqlInitialState } from '../../../utils/remote_state/remote_graphql_state';

export type SummaryGraphqlState = typeof initialSummaryGraphqlState;

export interface SummaryState {
  summary: SummaryGraphqlState;
  intervalSize: number;
}

export const initialSummaryGraphqlState = createGraphqlInitialState<
  LogSummaryQuery.LogSummaryBetween
>();

export const initialSummaryState: SummaryState = {
  summary: initialSummaryGraphqlState,
  intervalSize: 1000 * 60 * 60 * 24,
};
