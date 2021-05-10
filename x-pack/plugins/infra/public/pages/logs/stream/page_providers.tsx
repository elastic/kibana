/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext } from 'react';

import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { LogPositionState, WithLogPositionUrlState } from '../../../containers/logs/log_position';
import { LogFilterState, WithLogFilterUrlState } from '../../../containers/logs/log_filter';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { LogStreamProvider, useLogStreamContext } from '../../../containers/logs/log_stream';

const LogFilterStateProvider: React.FC = ({ children }) => {
  const { derivedIndexPattern } = useLogSourceContext();
  return (
    <LogFilterState.Provider indexPattern={derivedIndexPattern}>
      <WithLogFilterUrlState />
      {children}
    </LogFilterState.Provider>
  );
};

const ViewLogInContextProvider: React.FC = ({ children }) => {
  const { startTimestamp, endTimestamp } = useContext(LogPositionState.Context);
  const { sourceId } = useLogSourceContext();

  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  return (
    <ViewLogInContext.Provider
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      sourceId={sourceId}
    >
      {children}
    </ViewLogInContext.Provider>
  );
};

const LogEntriesStateProvider: React.FC = ({ children }) => {
  const { sourceId } = useLogSourceContext();
  const { startTimestamp, endTimestamp, targetPosition, isInitialized } = useContext(
    LogPositionState.Context
  );
  const { filterQuery } = useContext(LogFilterState.Context);

  // Don't render anything if the date range is incorrect.
  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  // Don't initialize the entries until the position has been fully intialized.
  // See `<WithLogPositionUrlState />`
  if (!isInitialized) {
    return null;
  }

  return (
    <LogStreamProvider
      sourceId={sourceId}
      startTimestamp={startTimestamp}
      endTimestamp={endTimestamp}
      query={filterQuery?.parsedQuery}
      center={targetPosition ?? undefined}
    >
      {children}
    </LogStreamProvider>
  );
};

const LogHighlightsStateProvider: React.FC = ({ children }) => {
  const { sourceId, sourceConfiguration } = useLogSourceContext();
  const { topCursor, bottomCursor, entries } = useLogStreamContext();
  const { filterQuery } = useContext(LogFilterState.Context);

  const highlightsProps = {
    sourceId,
    sourceVersion: sourceConfiguration?.version,
    entriesStart: topCursor,
    entriesEnd: bottomCursor,
    centerCursor: entries.length > 0 ? entries[Math.floor(entries.length / 2)].cursor : null,
    size: entries.length,
    filterQuery: filterQuery?.serializedQuery ?? null,
  };
  return <LogHighlightsState.Provider {...highlightsProps}>{children}</LogHighlightsState.Provider>;
};

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceStatus } = useLogSourceContext();

  // The providers assume the source is loaded, so short-circuit them otherwise
  if (sourceStatus?.logIndexStatus === 'missing') {
    return <>{children}</>;
  }

  return (
    <LogViewConfiguration.Provider>
      <LogFlyout.Provider>
        <LogPositionState.Provider>
          <WithLogPositionUrlState />
          <ViewLogInContextProvider>
            <LogFilterStateProvider>
              <LogEntriesStateProvider>
                <LogHighlightsStateProvider>{children}</LogHighlightsStateProvider>
              </LogEntriesStateProvider>
            </LogFilterStateProvider>
          </ViewLogInContextProvider>
        </LogPositionState.Provider>
      </LogFlyout.Provider>
    </LogViewConfiguration.Provider>
  );
};
