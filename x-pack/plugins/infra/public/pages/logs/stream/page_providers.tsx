/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import { LogFlyout } from '../../../containers/logs/log_flyout';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { LogHighlightsState } from '../../../containers/logs/log_highlights/log_highlights';
import { LogPositionState, WithLogPositionUrlState } from '../../../containers/logs/log_position';
import { LogFilterState, WithLogFilterUrlState } from '../../../containers/logs/log_filter';
import { LogEntriesState } from '../../../containers/logs/log_entries';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';

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
  const {
    startTimestamp,
    endTimestamp,
    timestampsLastUpdate,
    targetPosition,
    pagesBeforeStart,
    pagesAfterEnd,
    isStreaming,
    jumpToTargetPosition,
    isInitialized,
  } = useContext(LogPositionState.Context);
  const { filterQuery } = useContext(LogFilterState.Context);

  // Don't render anything if the date range is incorrect.
  if (!startTimestamp || !endTimestamp) {
    return null;
  }

  const entriesProps = {
    startTimestamp,
    endTimestamp,
    timestampsLastUpdate,
    timeKey: targetPosition,
    pagesBeforeStart,
    pagesAfterEnd,
    filterQuery,
    sourceId,
    isStreaming,
    jumpToTargetPosition,
  };

  // Don't initialize the entries until the position has been fully intialized.
  // See `<WithLogPositionUrlState />`
  if (!isInitialized) {
    return null;
  }

  return <LogEntriesState.Provider {...entriesProps}>{children}</LogEntriesState.Provider>;
};

const LogHighlightsStateProvider: React.FC = ({ children }) => {
  const { sourceId, sourceConfiguration } = useLogSourceContext();
  const [{ topCursor, bottomCursor, centerCursor, entries }] = useContext(LogEntriesState.Context);
  const { filterQuery } = useContext(LogFilterState.Context);

  const highlightsProps = {
    sourceId,
    sourceVersion: sourceConfiguration?.version,
    entriesStart: topCursor,
    entriesEnd: bottomCursor,
    centerCursor,
    size: entries.length,
    filterQuery,
  };
  return <LogHighlightsState.Provider {...highlightsProps}>{children}</LogHighlightsState.Provider>;
};

export const LogsPageProviders: React.FunctionComponent = ({ children }) => {
  const { sourceStatus } = useLogSourceContext();

  // The providers assume the source is loaded, so short-circuit them otherwise
  if (!sourceStatus?.logIndicesExist) {
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
