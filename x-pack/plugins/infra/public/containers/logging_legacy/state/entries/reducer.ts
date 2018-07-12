/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Action, combineReducers } from 'redux';
import { reducerWithInitialState, reducerWithoutInitialState } from 'typescript-fsa-reducers';

import {
  getIndexNearLogEntry,
  getIndexOfLogEntry,
  getLogEntryKey,
  LogEntry,
  LogEntryTime,
} from '../../../../../common/log_entry';
import {
  createFailureResultReducer,
  createIdleProgressReducer,
  createRunningProgressReducer,
  createSuccessResultReducer,
  initialLoadingState,
  isSuccessLoadingResult,
  LoadingState,
} from '../../../../utils/loading_state';
import {
  consolidateEntries,
  extendEntriesEnd,
  extendEntriesStart,
  replaceEntries,
  reportVisibleEntries,
  startLiveStreaming,
  stopLiveStreaming,
} from './actions';

interface EntriesLoadingParameters {
  count: number;
}

export interface EntriesState {
  start: LoadingState<EntriesLoadingParameters>;
  end: LoadingState<EntriesLoadingParameters>;
  entries: LogEntry[];
  visible: {
    startKey: LogEntryTime | null;
    middleKey: LogEntryTime | null;
    endKey: LogEntryTime | null;
  };
}

export const initialEntriesState: EntriesState = {
  end: initialLoadingState,
  entries: [],
  start: initialLoadingState,
  visible: {
    endKey: null,
    middleKey: null,
    startKey: null,
  },
};

const entriesStartCurrentProgressReducer = reducerWithInitialState(
  initialEntriesState.start.current
)
  .cases([replaceEntries.started, extendEntriesStart.started], createRunningProgressReducer())
  .cases(
    [
      extendEntriesStart.done,
      extendEntriesStart.failed,
      replaceEntries.done,
      replaceEntries.failed,
    ],
    createIdleProgressReducer()
  );

const entriesStartLastResultReducer = reducerWithInitialState(initialEntriesState.start.last)
  .case(
    replaceEntries.done,
    createSuccessResultReducer(({ count }, { logEntriesBefore }) => logEntriesBefore.length < count)
  )
  .case(
    extendEntriesStart.done,
    createSuccessResultReducer(({ count }, { logEntries }) => logEntries.length < count)
  )
  .cases([replaceEntries.failed, extendEntriesStart.failed], createFailureResultReducer());

const entriesStartPolicyReducer = reducerWithInitialState(initialEntriesState.start.policy);

const entriesStartReducer = combineReducers<EntriesState['start']>({
  current: entriesStartCurrentProgressReducer,
  last: entriesStartLastResultReducer,
  policy: entriesStartPolicyReducer,
});

const entriesEndCurrentProgressReducer = reducerWithInitialState(initialEntriesState.end.current)
  .cases([replaceEntries.started, extendEntriesEnd.started], createRunningProgressReducer())
  .cases(
    [extendEntriesEnd.done, extendEntriesEnd.failed, replaceEntries.done, replaceEntries.failed],
    createIdleProgressReducer()
  );

const entriesEndLastResultReducer = reducerWithInitialState(initialEntriesState.end.last)
  .case(
    replaceEntries.done,
    createSuccessResultReducer(({ count }, { logEntriesAfter }) => logEntriesAfter.length < count)
  )
  .case(
    extendEntriesEnd.done,
    createSuccessResultReducer(({ count }, { logEntries }) => logEntries.length < count - 1)
  )
  .cases([replaceEntries.failed, extendEntriesEnd.failed], createFailureResultReducer());

const entriesEndPolicyReducer = reducerWithInitialState(initialEntriesState.end.policy)
  .case(startLiveStreaming, () => ({
    delayMillis: 5000,
    policy: 'interval',
  }))
  .case(stopLiveStreaming, () => ({
    policy: 'manual',
  }));

const entriesEndReducer = combineReducers<EntriesState['end']>({
  current: entriesEndCurrentProgressReducer,
  last: entriesEndLastResultReducer,
  policy: entriesEndPolicyReducer,
});

const entriesEntriesReducer = reducerWithInitialState(initialEntriesState.entries)
  .case(replaceEntries.started, (state, { clearEagerly }) => (clearEagerly ? [] : state))
  .case(
    replaceEntries.done,
    (state, { params: { clearEagerly }, result: { logEntriesBefore, logEntriesAfter } }) =>
      clearEagerly
        ? [...logEntriesBefore, ...logEntriesAfter]
        : [...logEntriesBefore, ...logEntriesAfter].map(logEntry => {
            const oldLogEntryIndex = getIndexOfLogEntry(state, getLogEntryKey(logEntry));
            if (oldLogEntryIndex) {
              const oldLogEntry = state[oldLogEntryIndex];
              if (oldLogEntry.origin.id === logEntry.origin.id) {
                return oldLogEntry;
              }
            }
            return logEntry;
          })
  )
  .case(extendEntriesStart.done, (state, { result: { logEntries } }) => {
    if (logEntries.length > 0) {
      const lastLogEntry = logEntries[logEntries.length - 1];
      const prependAtIndex = getIndexNearLogEntry(state, getLogEntryKey(lastLogEntry), true);
      return [...logEntries, ...state.slice(prependAtIndex)];
    } else {
      return state;
    }
  })
  .case(extendEntriesEnd.done, (state, { result: { logEntries } }) => {
    if (logEntries.length > 0) {
      const firstLogEntry = logEntries[0];
      const appendAtIndex = getIndexNearLogEntry(state, getLogEntryKey(firstLogEntry));
      return [...state.slice(0, appendAtIndex), ...logEntries];
    } else {
      return state;
    }
  });

const entriesCrossSliceReducer = reducerWithoutInitialState<EntriesState>().case(
  consolidateEntries,
  (state, { after, before, target }) => {
    const { start, end, entries } = state;
    const targetIndex = getIndexNearLogEntry(entries, target);

    if (targetIndex === null) {
      return state;
    }

    const startIndex = Math.max(targetIndex - before, 0);
    const endIndex = Math.min(targetIndex + after, entries.length);
    const consolidatedLogEntries = entries.slice(startIndex, endIndex);
    const newStartLoadingState: typeof start =
      startIndex > 0 && isSuccessLoadingResult(start.last)
        ? {
            ...start,
            last: {
              ...start.last,
              isExhausted: false,
            },
          }
        : start;
    const newEndLoadingState: typeof end =
      endIndex < entries.length && isSuccessLoadingResult(end.last)
        ? {
            ...end,
            last: {
              ...end.last,
              isExhausted: false,
            },
          }
        : end;

    return {
      ...state,
      end: newEndLoadingState,
      entries: consolidatedLogEntries,
      start: newStartLoadingState,
    };
  }
);

const entriesVisibleReducer = reducerWithInitialState(initialEntriesState.visible).case(
  reportVisibleEntries,
  (state, { startKey, middleKey, endKey }) => ({
    endKey,
    middleKey,
    startKey,
  })
);

const combinedEntriesSliceReducer = combineReducers<EntriesState>({
  end: entriesEndReducer,
  entries: entriesEntriesReducer,
  start: entriesStartReducer,
  visible: entriesVisibleReducer,
});

export const entriesReducer = (
  state: EntriesState = initialEntriesState,
  action: Action
): EntriesState => {
  const updatedSliceState = combinedEntriesSliceReducer(state, action);
  const updatedCrossSliceState = entriesCrossSliceReducer(updatedSliceState, action);

  return updatedCrossSliceState;
};
