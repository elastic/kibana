/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import React, { useMemo, FC, PropsWithChildren } from 'react';
import {
  LogHighlightsStateProvider,
  LogPositionStateProvider,
  LogStreamProvider,
  useLogPositionStateContext,
  useLogStreamContext,
  useLogViewContext,
} from '@kbn/logs-shared-plugin/public';
import {
  LogStreamPageActorRef,
  LogStreamPageCallbacks,
} from '../../../observability_logs/log_stream_page/state';
import { LogEntryFlyoutProvider } from '../../../containers/logs/log_flyout';
import { LogViewConfigurationProvider } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContextProvider } from '../../../containers/logs/view_log_in_context';
import { MatchedStateFromActor } from '../../../observability_logs/xstate_helpers';

const ViewLogInContext: FC<PropsWithChildren<unknown>> = ({ children }) => {
  const { startTimestamp, endTimestamp } = useLogPositionStateContext();
  const { logViewReference } = useLogViewContext();

  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <ViewLogInContextProvider
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      logViewReference={logViewReference}
    >
      {children}
    </ViewLogInContextProvider>
  );
};

const LogEntriesStateProvider: FC<
  PropsWithChildren<{
    logStreamPageState: InitializedLogStreamPageState;
  }>
> = ({ children, logStreamPageState }) => {
  const { logViewReference } = useLogViewContext();
  const { startTimestamp, endTimestamp, targetPosition } = useLogPositionStateContext();
  const {
    context: { parsedQuery },
  } = logStreamPageState;

  // Don't render anything if the date range is incorrect.
  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <LogStreamProvider
      logViewReference={logViewReference}
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      query={parsedQuery}
      center={targetPosition ?? undefined}
    >
      {children}
    </LogStreamProvider>
  );
};

const LogHighlightsState: FC<
  PropsWithChildren<{
    logStreamPageState: InitializedLogStreamPageState;
  }>
> = ({ children, logStreamPageState }) => {
  const { logViewReference, logView } = useLogViewContext();
  const { topCursor, bottomCursor, entries } = useLogStreamContext();
  const serializedParsedQuery = useMemo(
    () => stringify(logStreamPageState.context.parsedQuery),
    [logStreamPageState.context.parsedQuery]
  );

  const highlightsProps = {
    logViewReference,
    sourceVersion: logView?.version,
    entriesStart: topCursor,
    entriesEnd: bottomCursor,
    centerCursor: entries.length > 0 ? entries[Math.floor(entries.length / 2)].cursor : null,
    size: entries.length,
    filterQuery: serializedParsedQuery,
  };
  return <LogHighlightsStateProvider {...highlightsProps}>{children}</LogHighlightsStateProvider>;
};

export const LogStreamPageContentProviders: FC<
  PropsWithChildren<{
    logStreamPageState: InitializedLogStreamPageState;
    logStreamPageCallbacks: LogStreamPageCallbacks;
  }>
> = ({ children, logStreamPageState, logStreamPageCallbacks }) => {
  return (
    <LogViewConfigurationProvider>
      <LogEntryFlyoutProvider>
        <LogPositionStateProvider
          logStreamPageState={logStreamPageState}
          logStreamPageCallbacks={logStreamPageCallbacks}
        >
          <ViewLogInContext>
            <LogEntriesStateProvider logStreamPageState={logStreamPageState}>
              <LogHighlightsState logStreamPageState={logStreamPageState}>
                {children}
              </LogHighlightsState>
            </LogEntriesStateProvider>
          </ViewLogInContext>
        </LogPositionStateProvider>
      </LogEntryFlyoutProvider>
    </LogViewConfigurationProvider>
  );
};

type InitializedLogStreamPageState = MatchedStateFromActor<
  LogStreamPageActorRef,
  { hasLogViewIndices: 'initialized' }
>;
