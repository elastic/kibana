/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import stringify from 'json-stable-stringify';
import React, { useMemo } from 'react';
import { LogStreamPageActorRef } from '../../../observability_logs/log_stream_page/state';
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
  logStreamPageState: InitializedLogStreamPageState;
}> = ({ children, logStreamPageState }) => {
  const { logViewId } = useLogViewContext();
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
  logStreamPageState: InitializedLogStreamPageState;
}> = ({ children, logStreamPageState }) => {
  const { logViewId, logView } = useLogViewContext();
  const { topCursor, bottomCursor, entries } = useLogStreamContext();
  const serializedParsedQuery = useMemo(
    () => stringify(logStreamPageState.context.parsedQuery),
    [logStreamPageState.context.parsedQuery]
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
  logStreamPageState: InitializedLogStreamPageState;
}> = ({ children, logStreamPageState }) => {
  return (
    <LogViewConfigurationProvider>
      <LogEntryFlyoutProvider>
        <LogPositionStateProvider>
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
