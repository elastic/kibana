/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useReducer, useCallback } from 'react';
import useMountedState from 'react-use/lib/useMountedState';
import createContainer from 'constate';
import { pick, throttle } from 'lodash';
import { TimeKey, timeKeyIsBetween } from '../../../../common/time';
import {
  LogEntriesResponse,
  LogEntriesRequest,
  LogEntriesBaseRequest,
} from '../../../../common/http_api';
import { LogEntry } from '../../../../common/log_entry';
import { fetchLogEntries } from './api/fetch_log_entries';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const DESIRED_BUFFER_PAGES = 2;
const LIVE_STREAM_INTERVAL = 5000;

enum Action {
  FetchingNewEntries,
  FetchingMoreEntries,
  ReceiveNewEntries,
  ReceiveEntriesBefore,
  ReceiveEntriesAfter,
  ErrorOnNewEntries,
  ErrorOnMoreEntries,
  ExpandRange,
}

type ReceiveActions =
  | Action.ReceiveNewEntries
  | Action.ReceiveEntriesBefore
  | Action.ReceiveEntriesAfter;

interface ReceiveEntriesAction {
  type: ReceiveActions;
  payload: LogEntriesResponse['data'];
}
interface ExpandRangeAction {
  type: Action.ExpandRange;
  payload: { before: boolean; after: boolean };
}
interface FetchOrErrorAction {
  type: Exclude<Action, ReceiveActions | Action.ExpandRange>;
}
type ActionObj = ReceiveEntriesAction | FetchOrErrorAction | ExpandRangeAction;

type Dispatch = (action: ActionObj) => void;

interface LogEntriesProps {
  startTimestamp: number;
  endTimestamp: number;
  timestampsLastUpdate: number;
  filterQuery: string | null;
  timeKey: TimeKey | null;
  pagesBeforeStart: number | null;
  pagesAfterEnd: number | null;
  sourceId: string;
  isStreaming: boolean;
  jumpToTargetPosition: (position: TimeKey) => void;
}

type FetchEntriesParams = Omit<LogEntriesProps, 'isStreaming'>;
type FetchMoreEntriesParams = Pick<LogEntriesProps, 'pagesBeforeStart' | 'pagesAfterEnd'>;

export interface LogEntriesStateParams {
  entries: LogEntriesResponse['data']['entries'];
  topCursor: LogEntriesResponse['data']['topCursor'] | null;
  bottomCursor: LogEntriesResponse['data']['bottomCursor'] | null;
  centerCursor: TimeKey | null;
  isReloading: boolean;
  isLoadingMore: boolean;
  lastLoadedTime: Date | null;
  hasMoreBeforeStart: boolean;
  hasMoreAfterEnd: boolean;
}

export interface LogEntriesCallbacks {
  fetchNewerEntries: () => Promise<TimeKey | null | undefined>;
  checkForNewEntries: () => Promise<void>;
}
export const logEntriesInitialCallbacks = {
  fetchNewerEntries: async () => {},
};

export const logEntriesInitialState: LogEntriesStateParams = {
  entries: [],
  topCursor: null,
  bottomCursor: null,
  centerCursor: null,
  isReloading: true,
  isLoadingMore: false,
  lastLoadedTime: null,
  hasMoreBeforeStart: false,
  hasMoreAfterEnd: false,
};

const cleanDuplicateItems = (entriesA: LogEntry[], entriesB: LogEntry[]) => {
  const ids = new Set(entriesB.map((item) => item.id));
  return entriesA.filter((item) => !ids.has(item.id));
};

const shouldFetchNewEntries = ({
  prevParams,
  timeKey,
  filterQuery,
  topCursor,
  bottomCursor,
  startTimestamp,
  endTimestamp,
}: FetchEntriesParams & LogEntriesStateParams & { prevParams: FetchEntriesParams | undefined }) => {
  const shouldLoadWithNewDates = prevParams
    ? (startTimestamp !== prevParams.startTimestamp &&
        startTimestamp > prevParams.startTimestamp) ||
      (endTimestamp !== prevParams.endTimestamp && endTimestamp < prevParams.endTimestamp)
    : true;
  const shouldLoadWithNewFilter = prevParams ? filterQuery !== prevParams.filterQuery : true;
  const shouldLoadAroundNewPosition =
    timeKey && (!topCursor || !bottomCursor || !timeKeyIsBetween(topCursor, bottomCursor, timeKey));

  return shouldLoadWithNewDates || shouldLoadWithNewFilter || shouldLoadAroundNewPosition;
};

enum ShouldFetchMoreEntries {
  Before,
  After,
}

const shouldFetchMoreEntries = (
  { pagesAfterEnd, pagesBeforeStart }: FetchMoreEntriesParams,
  { hasMoreBeforeStart, hasMoreAfterEnd }: LogEntriesStateParams
) => {
  if (pagesBeforeStart === null || pagesAfterEnd === null) return false;
  if (pagesBeforeStart < DESIRED_BUFFER_PAGES && hasMoreBeforeStart)
    return ShouldFetchMoreEntries.Before;
  if (pagesAfterEnd < DESIRED_BUFFER_PAGES && hasMoreAfterEnd) return ShouldFetchMoreEntries.After;
  return false;
};

const useFetchEntriesEffect = (
  state: LogEntriesStateParams,
  dispatch: Dispatch,
  props: LogEntriesProps
) => {
  const { services } = useKibanaContextForPlugin();
  const isMounted = useMountedState();
  const [prevParams, cachePrevParams] = useState<LogEntriesProps | undefined>();
  const [startedStreaming, setStartedStreaming] = useState(false);
  const dispatchIfMounted = useCallback((action) => (isMounted() ? dispatch(action) : undefined), [
    dispatch,
    isMounted,
  ]);

  const runFetchNewEntriesRequest = async (overrides: Partial<LogEntriesProps> = {}) => {
    if (!props.startTimestamp || !props.endTimestamp) {
      return;
    }

    dispatchIfMounted({ type: Action.FetchingNewEntries });

    try {
      const commonFetchArgs: LogEntriesBaseRequest = {
        sourceId: overrides.sourceId || props.sourceId,
        startTimestamp: overrides.startTimestamp || props.startTimestamp,
        endTimestamp: overrides.endTimestamp || props.endTimestamp,
        query: overrides.filterQuery || props.filterQuery,
      };

      const fetchArgs: LogEntriesRequest = props.timeKey
        ? {
            ...commonFetchArgs,
            center: props.timeKey,
          }
        : {
            ...commonFetchArgs,
            before: 'last',
          };

      const { data: payload } = await fetchLogEntries(fetchArgs, services.http.fetch);
      dispatchIfMounted({ type: Action.ReceiveNewEntries, payload });

      // Move position to the bottom if it's the first load.
      // Do it in the next tick to allow the `dispatch` to fire
      if (!props.timeKey && payload.bottomCursor) {
        setTimeout(() => {
          if (isMounted()) {
            props.jumpToTargetPosition(payload.bottomCursor!);
          }
        });
      } else if (
        props.timeKey &&
        payload.topCursor &&
        payload.bottomCursor &&
        !timeKeyIsBetween(payload.topCursor, payload.bottomCursor, props.timeKey)
      ) {
        props.jumpToTargetPosition(payload.topCursor);
      }
    } catch (e) {
      dispatchIfMounted({ type: Action.ErrorOnNewEntries });
    }
  };

  const runFetchMoreEntriesRequest = async (
    direction: ShouldFetchMoreEntries,
    overrides: Partial<LogEntriesProps> = {}
  ) => {
    if (!props.startTimestamp || !props.endTimestamp) {
      return;
    }
    const getEntriesBefore = direction === ShouldFetchMoreEntries.Before;

    // Control that cursors are correct
    if ((getEntriesBefore && !state.topCursor) || !state.bottomCursor) {
      return;
    }

    dispatchIfMounted({ type: Action.FetchingMoreEntries });

    try {
      const commonFetchArgs: LogEntriesBaseRequest = {
        sourceId: overrides.sourceId || props.sourceId,
        startTimestamp: overrides.startTimestamp || props.startTimestamp,
        endTimestamp: overrides.endTimestamp || props.endTimestamp,
        query: overrides.filterQuery || props.filterQuery,
      };

      const fetchArgs: LogEntriesRequest = getEntriesBefore
        ? {
            ...commonFetchArgs,
            before: state.topCursor!, // We already check for nullity above
          }
        : {
            ...commonFetchArgs,
            after: state.bottomCursor,
          };

      const { data: payload } = await fetchLogEntries(fetchArgs, services.http.fetch);

      dispatchIfMounted({
        type: getEntriesBefore ? Action.ReceiveEntriesBefore : Action.ReceiveEntriesAfter,
        payload,
      });

      return payload.bottomCursor;
    } catch (e) {
      dispatchIfMounted({ type: Action.ErrorOnMoreEntries });
    }
  };

  const fetchNewEntriesEffectDependencies = Object.values(
    pick(props, ['sourceId', 'filterQuery', 'timeKey', 'startTimestamp', 'endTimestamp'])
  );
  const fetchNewEntriesEffect = () => {
    if (props.isStreaming && prevParams) return;
    if (shouldFetchNewEntries({ ...props, ...state, prevParams })) {
      runFetchNewEntriesRequest();
    }
    cachePrevParams(props);
  };

  const fetchMoreEntriesEffectDependencies = [
    ...Object.values(pick(props, ['pagesAfterEnd', 'pagesBeforeStart'])),
    Object.values(pick(state, ['hasMoreBeforeStart', 'hasMoreAfterEnd'])),
  ];
  const fetchMoreEntriesEffect = () => {
    if (state.isLoadingMore || props.isStreaming) return;
    const direction = shouldFetchMoreEntries(props, state);
    switch (direction) {
      case ShouldFetchMoreEntries.Before:
      case ShouldFetchMoreEntries.After:
        runFetchMoreEntriesRequest(direction);
        break;
      default:
        break;
    }
  };

  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  const fetchNewerEntries = useCallback(
    throttle(() => runFetchMoreEntriesRequest(ShouldFetchMoreEntries.After), 500),
    [props, state.bottomCursor]
  );

  const streamEntriesEffectDependencies = [
    props.isStreaming,
    state.isLoadingMore,
    state.isReloading,
  ];
  const streamEntriesEffect = () => {
    (async () => {
      if (props.isStreaming && !state.isLoadingMore && !state.isReloading) {
        const endTimestamp = Date.now();
        if (startedStreaming) {
          await new Promise((res) => setTimeout(res, LIVE_STREAM_INTERVAL));
        } else {
          props.jumpToTargetPosition({ tiebreaker: 0, time: endTimestamp });
          setStartedStreaming(true);
          if (state.hasMoreAfterEnd) {
            runFetchNewEntriesRequest({ endTimestamp });
            return;
          }
        }
        const newEntriesEnd = await runFetchMoreEntriesRequest(ShouldFetchMoreEntries.After, {
          endTimestamp,
        });
        if (newEntriesEnd) {
          props.jumpToTargetPosition(newEntriesEnd);
        }
      } else if (!props.isStreaming) {
        setStartedStreaming(false);
      }
    })();
  };

  const expandRangeEffect = () => {
    if (!prevParams || !prevParams.startTimestamp || !prevParams.endTimestamp) {
      return;
    }

    if (props.timestampsLastUpdate === prevParams.timestampsLastUpdate) {
      return;
    }

    const shouldExpand = {
      before: props.startTimestamp < prevParams.startTimestamp,
      after: props.endTimestamp > prevParams.endTimestamp,
    };

    dispatchIfMounted({ type: Action.ExpandRange, payload: shouldExpand });
  };

  const expandRangeEffectDependencies = [
    prevParams?.startTimestamp,
    prevParams?.endTimestamp,
    props.startTimestamp,
    props.endTimestamp,
    props.timestampsLastUpdate,
  ];

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(fetchNewEntriesEffect, fetchNewEntriesEffectDependencies);
  useEffect(fetchMoreEntriesEffect, fetchMoreEntriesEffectDependencies);
  useEffect(streamEntriesEffect, streamEntriesEffectDependencies);
  useEffect(expandRangeEffect, expandRangeEffectDependencies);
  /* eslint-enable react-hooks/exhaustive-deps */

  return { fetchNewerEntries, checkForNewEntries: runFetchNewEntriesRequest };
};

export const useLogEntriesState: (
  props: LogEntriesProps
) => [LogEntriesStateParams, LogEntriesCallbacks] = (props) => {
  const [state, dispatch] = useReducer(logEntriesStateReducer, logEntriesInitialState);

  const { fetchNewerEntries, checkForNewEntries } = useFetchEntriesEffect(state, dispatch, props);
  const callbacks = { fetchNewerEntries, checkForNewEntries };

  return [state, callbacks];
};

const logEntriesStateReducer = (prevState: LogEntriesStateParams, action: ActionObj) => {
  switch (action.type) {
    case Action.ReceiveNewEntries:
      return {
        ...prevState,
        entries: action.payload.entries,
        topCursor: action.payload.topCursor,
        bottomCursor: action.payload.bottomCursor,
        centerCursor: getCenterCursor(action.payload.entries),
        lastLoadedTime: new Date(),
        isReloading: false,
        hasMoreBeforeStart: action.payload.hasMoreBefore ?? prevState.hasMoreBeforeStart,
        hasMoreAfterEnd: action.payload.hasMoreAfter ?? prevState.hasMoreAfterEnd,
      };

    case Action.ReceiveEntriesBefore: {
      const newEntries = action.payload.entries;
      const prevEntries = cleanDuplicateItems(prevState.entries, newEntries);
      const entries = [...newEntries, ...prevEntries];

      const update = {
        entries,
        isLoadingMore: false,
        hasMoreBeforeStart: action.payload.hasMoreBefore ?? prevState.hasMoreBeforeStart,
        // Keep the previous cursor if request comes empty, to easily extend the range.
        topCursor: newEntries.length > 0 ? action.payload.topCursor : prevState.topCursor,
        centerCursor: getCenterCursor(entries),
        lastLoadedTime: new Date(),
      };

      return { ...prevState, ...update };
    }
    case Action.ReceiveEntriesAfter: {
      const newEntries = action.payload.entries;
      const prevEntries = cleanDuplicateItems(prevState.entries, newEntries);
      const entries = [...prevEntries, ...newEntries];

      const update = {
        entries,
        isLoadingMore: false,
        hasMoreAfterEnd: action.payload.hasMoreAfter ?? prevState.hasMoreAfterEnd,
        // Keep the previous cursor if request comes empty, to easily extend the range.
        bottomCursor: newEntries.length > 0 ? action.payload.bottomCursor : prevState.bottomCursor,
        centerCursor: getCenterCursor(entries),
        lastLoadedTime: new Date(),
      };

      return { ...prevState, ...update };
    }
    case Action.FetchingNewEntries:
      return {
        ...prevState,
        isReloading: true,
        entries: [],
        topCursor: null,
        bottomCursor: null,
        centerCursor: null,
        // Assume there are more pages on both ends unless proven wrong by the
        // API with an explicit `false` response.
        hasMoreBeforeStart: true,
        hasMoreAfterEnd: true,
      };
    case Action.FetchingMoreEntries:
      return { ...prevState, isLoadingMore: true };
    case Action.ErrorOnNewEntries:
      return { ...prevState, isReloading: false };
    case Action.ErrorOnMoreEntries:
      return { ...prevState, isLoadingMore: false };

    case Action.ExpandRange: {
      const hasMoreBeforeStart = action.payload.before ? true : prevState.hasMoreBeforeStart;
      const hasMoreAfterEnd = action.payload.after ? true : prevState.hasMoreAfterEnd;

      return {
        ...prevState,
        hasMoreBeforeStart,
        hasMoreAfterEnd,
      };
    }
    default:
      throw new Error();
  }
};

function getCenterCursor(entries: LogEntry[]): TimeKey | null {
  return entries.length > 0 ? entries[Math.floor(entries.length / 2)].cursor : null;
}

export const LogEntriesState = createContainer(useLogEntriesState);
