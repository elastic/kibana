/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import React, { useMemo } from 'react';
import { LogEntryFlyoutProvider } from '../../../containers/logs/log_flyout';
import { LogHighlightsStateProvider } from '../../../containers/logs/log_highlights/log_highlights';
import {
  LogPositionStateProvider,
  useLogPositionStateContext,
} from '../../../containers/logs/log_position';
import { LogStreamProvider, useLogStreamContext } from '../../../containers/logs/log_stream';
import { LogViewConfigurationProvider } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContextProvider } from '../../../containers/logs/view_log_in_context';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { LogStreamQueryActorRef } from '../../../observability_logs/log_stream_query_state';
import { MatchedStateFromActor } from '../../../observability_logs/xstate_helpers';

const ViewLogInContext: React.FC = ({ children }) => {
  const { startTimestamp, endTimestamp } = useLogPositionStateContext();
  const { logViewId } = useLogViewContext();

  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <ViewLogInContextProvider
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      sourceId={logViewId}
    >
      {children}
    </ViewLogInContextProvider>
  );
};

const LogEntriesStateProvider: React.FC<{
  logStreamQueryState: LogStreamQueryStateWithQuery;
}> = ({ children, logStreamQueryState }) => {
  const { logViewId } = useLogViewContext();
  const { startTimestamp, endTimestamp, targetPosition } = useLogPositionStateContext();
  const {
    context: { parsedQuery },
  } = logStreamQueryState;

  // Don't render anything if the date range is incorrect.
  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <LogStreamProvider
      sourceId={logViewId}
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      query={parsedQuery}
      center={targetPosition ?? undefined}
    >
      {children}
    </LogStreamProvider>
  );
};

const LogHighlightsState: React.FC<{
  logStreamQueryState: LogStreamQueryStateWithQuery;
}> = ({ children, logStreamQueryState }) => {
  const { logViewId, logView } = useLogViewContext();
  const { topCursor, bottomCursor, entries } = useLogStreamContext();
  const serializedParsedQuery = useMemo(
    () => stringify(logStreamQueryState.context.parsedQuery),
    [logStreamQueryState.context.parsedQuery]
  );

  const highlightsProps = {
    sourceId: logViewId,
    sourceVersion: logView?.version,
    entriesStart: topCursor,
    entriesEnd: bottomCursor,
    centerCursor: entries.length > 0 ? entries[Math.floor(entries.length / 2)].cursor : null,
    size: entries.length,
    filterQuery: serializedParsedQuery,
  };
  return <LogHighlightsStateProvider {...highlightsProps}>{children}</LogHighlightsStateProvider>;
};

export const LogStreamPageContentProviders: React.FC<{
  logStreamQueryState: LogStreamQueryStateWithQuery;
}> = ({ children, logStreamQueryState }) => {
  return (
    <LogViewConfigurationProvider>
      <LogEntryFlyoutProvider>
        <LogPositionStateProvider>
          <ViewLogInContext>
            <LogEntriesStateProvider logStreamQueryState={logStreamQueryState}>
              <LogHighlightsState logStreamQueryState={logStreamQueryState}>
                {children}
              </LogHighlightsState>
            </LogEntriesStateProvider>
          </ViewLogInContext>
        </LogPositionStateProvider>
      </LogEntryFlyoutProvider>
    </LogViewConfigurationProvider>
  );
};

type LogStreamQueryStateWithQuery = MatchedStateFromActor<LogStreamQueryActorRef, 'hasQuery'>;
