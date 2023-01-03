/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  LogFilterStateProvider,
  useLogFilterStateContext,
  WithLogFilterUrlState,
} from '../../../containers/logs/log_filter';
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
import { LogStreamPageStateProvider } from '../../../observability_logs/log_stream_page/state';
import { type LogViewNotificationChannel } from '../../../observability_logs/log_view_state';

const LogFilterState: React.FC = ({ children }) => {
  const { derivedDataView } = useLogViewContext();

  return (
    <LogFilterStateProvider dataView={derivedDataView}>
      <WithLogFilterUrlState />
      {children}
    </LogFilterStateProvider>
  );
};

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

const LogEntriesStateProvider: React.FC = ({ children }) => {
  const { logViewId } = useLogViewContext();
  const { startTimestamp, endTimestamp, targetPosition } = useLogPositionStateContext();
  const { filterQuery } = useLogFilterStateContext();

  // Don't render anything if the date range is incorrect.
  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <LogStreamProvider
      sourceId={logViewId}
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      query={filterQuery?.parsedQuery}
      center={targetPosition ?? undefined}
    >
      {children}
    </LogStreamProvider>
  );
};

const LogHighlightsState: React.FC = ({ children }) => {
  const { logViewId, logView } = useLogViewContext();
  const { topCursor, bottomCursor, entries } = useLogStreamContext();
  const { filterQuery } = useLogFilterStateContext();

  const highlightsProps = {
    sourceId: logViewId,
    sourceVersion: logView?.version,
    entriesStart: topCursor,
    entriesEnd: bottomCursor,
    centerCursor: entries.length > 0 ? entries[Math.floor(entries.length / 2)].cursor : null,
    size: entries.length,
    filterQuery: filterQuery?.serializedQuery ?? null,
  };
  return <LogHighlightsStateProvider {...highlightsProps}>{children}</LogHighlightsStateProvider>;
};

export const LogStreamPageProviders: React.FunctionComponent<{
  logViewStateNotifications: LogViewNotificationChannel;
}> = ({ children, logViewStateNotifications }) => {
  return (
    <LogStreamPageStateProvider logViewStateNotifications={logViewStateNotifications}>
      {children}
    </LogStreamPageStateProvider>
  );
};

export const LogStreamPageContentProviders: React.FunctionComponent = ({ children }) => {
  return (
    <LogViewConfigurationProvider>
      <LogEntryFlyoutProvider>
        <LogPositionStateProvider>
          <ViewLogInContext>
            <LogFilterState>
              <LogEntriesStateProvider>
                <LogHighlightsState>{children}</LogHighlightsState>
              </LogEntriesStateProvider>
            </LogFilterState>
          </ViewLogInContext>
        </LogPositionStateProvider>
      </LogEntryFlyoutProvider>
    </LogViewConfigurationProvider>
  );
};
