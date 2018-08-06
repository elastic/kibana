/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraTimeKey, LogEntries as LogEntriesQuery } from '../../../../../common/graphql/types';
import { createGraphqlInitialState } from '../../../../utils/remote_state/remote_graphql_state';

export type EntriesGraphqlState = typeof initialEntriesGraphqlState;

export interface EntriesState {
  entries: EntriesGraphqlState;
  visible: {
    startKey: InfraTimeKey | null;
    middleKey: InfraTimeKey | null;
    endKey: InfraTimeKey | null;
  };
}

export const initialEntriesGraphqlState = createGraphqlInitialState<
  LogEntriesQuery.LogEntriesAround
>();

export const initialEntriesState: EntriesState = {
  entries: initialEntriesGraphqlState,
  visible: {
    endKey: null,
    middleKey: null,
    startKey: null,
  },
};
