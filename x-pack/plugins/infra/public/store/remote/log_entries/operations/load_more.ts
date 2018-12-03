/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntries as LogEntriesQuery } from '../../../../../common/graphql/types';
import {
  getLogEntryIndexAfterTime,
  getLogEntryIndexBeforeTime,
  getLogEntryKey,
} from '../../../../utils/log_entry';
import {
  createGraphqlOperationActionCreators,
  createGraphqlOperationReducer,
  createGraphqlQueryEpic,
} from '../../../../utils/remote_state/remote_graphql_state';
import { initialLogEntriesState } from '../state';
import { logEntriesQuery } from './log_entries.gql_query';

const operationKey = 'load_more';

export const loadMoreEntriesActionCreators = createGraphqlOperationActionCreators<
  LogEntriesQuery.Query,
  LogEntriesQuery.Variables
>('log_entries', operationKey);

export const loadMoreEntriesReducer = createGraphqlOperationReducer(
  operationKey,
  initialLogEntriesState,
  loadMoreEntriesActionCreators,
  (state, action) => {
    const logEntriesAround = action.payload.result.data.source.logEntriesAround;
    const newEntries = logEntriesAround.entries;
    const oldEntries = state && state.entries ? state.entries : [];
    const oldStart = state && state.start ? state.start : null;
    const oldEnd = state && state.end ? state.end : null;

    if (newEntries.length <= 0) {
      return state;
    }

    if ((action.payload.params.countBefore || 0) > 0) {
      const lastLogEntry = newEntries[newEntries.length - 1];
      const prependAtIndex = getLogEntryIndexAfterTime(oldEntries, getLogEntryKey(lastLogEntry));
      return {
        start: logEntriesAround.start,
        end: oldEnd,
        hasMoreBefore: logEntriesAround.hasMoreBefore,
        hasMoreAfter: state ? state.hasMoreAfter : logEntriesAround.hasMoreAfter,
        entries: [...newEntries, ...oldEntries.slice(prependAtIndex)],
      };
    } else if ((action.payload.params.countAfter || 0) > 0) {
      const firstLogEntry = newEntries[0];
      const appendAtIndex = getLogEntryIndexBeforeTime(oldEntries, getLogEntryKey(firstLogEntry));
      return {
        start: oldStart,
        end: logEntriesAround.end,
        hasMoreBefore: state ? state.hasMoreBefore : logEntriesAround.hasMoreBefore,
        hasMoreAfter: logEntriesAround.hasMoreAfter,
        entries: [...oldEntries.slice(0, appendAtIndex), ...newEntries],
      };
    } else {
      return state;
    }
  }
);

export const loadMoreEntriesEpic = createGraphqlQueryEpic(
  logEntriesQuery,
  loadMoreEntriesActionCreators
);
