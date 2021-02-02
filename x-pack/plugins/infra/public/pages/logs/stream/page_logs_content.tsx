/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useContext, useCallback, useMemo } from 'react';
import { LogEntry } from '../../../../common/log_entry';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { AutoSizer } from '../../../components/auto_sizer';
import { LogEntryFlyout } from '../../../components/logging/log_entry_flyout';
import { LogMinimap } from '../../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { LogEntryStreamItem } from '../../../components/logging/log_text_stream/item';
import { PageContent } from '../../../components/page';
import { LogEntriesState } from '../../../containers/logs/log_entries';
import { LogFilterState } from '../../../containers/logs/log_filter';
import {
  useLogEntryFlyoutContext,
  WithFlyoutOptionsUrlState,
} from '../../../containers/logs/log_flyout';
import { LogHighlightsState } from '../../../containers/logs/log_highlights';
import { LogPositionState } from '../../../containers/logs/log_position';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { WithSummary } from '../../../containers/logs/log_summary';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { WithLogTextviewUrlState } from '../../../containers/logs/with_log_textview';
import { LogsToolbar } from './page_toolbar';
import { PageViewLogInContext } from './page_view_log_in_context';

export const LogsPageLogsContent: React.FunctionComponent = () => {
  const { sourceConfiguration, sourceId } = useLogSourceContext();
  const { textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const {
    surroundingLogsId,
    setSurroundingLogsId,
    closeFlyout: closeLogEntryFlyout,
    openFlyout: openLogEntryFlyout,
    isFlyoutOpen,
    logEntryId: flyoutLogEntryId,
  } = useLogEntryFlyoutContext();

  const [logEntriesState, logEntriesCallbacks] = useContext(LogEntriesState.Context);
  const {
    isReloading,
    entries,
    hasMoreAfterEnd,
    hasMoreBeforeStart,
    isLoadingMore,
    lastLoadedTime,
  } = logEntriesState;
  const { checkForNewEntries } = logEntriesCallbacks;
  const { logSummaryHighlights, currentHighlightKey, logEntryHighlightsById } = useContext(
    LogHighlightsState.Context
  );

  const items = useMemo(
    () =>
      isReloading
        ? []
        : entries.map((logEntry) =>
            createLogEntryStreamItem(logEntry, logEntryHighlightsById[logEntry.id] || [])
          ),

    [entries, isReloading, logEntryHighlightsById]
  );

  const { applyLogFilterQuery } = useContext(LogFilterState.Context);
  const {
    isStreaming,
    targetPosition,
    visibleMidpointTime,
    visibleTimeInterval,
    reportVisiblePositions,
    jumpToTargetPosition,
    startLiveStreaming,
    stopLiveStreaming,
    startDateExpression,
    endDateExpression,
    updateDateRange,
  } = useContext(LogPositionState.Context);

  const [, { setContextEntry }] = useContext(ViewLogInContext.Context);

  const setFilter = useCallback(
    (filter, flyoutItemId, timeKey) => {
      applyLogFilterQuery(filter);
      if (timeKey) {
        jumpToTargetPosition(timeKey);
      }
      setSurroundingLogsId(flyoutItemId);
      stopLiveStreaming();
    },
    [applyLogFilterQuery, jumpToTargetPosition, setSurroundingLogsId, stopLiveStreaming]
  );

  return (
    <>
      <WithLogTextviewUrlState />
      <WithFlyoutOptionsUrlState />
      <LogsToolbar />
      <PageViewLogInContext />
      {isFlyoutOpen ? (
        <LogEntryFlyout
          logEntryId={flyoutLogEntryId}
          onCloseFlyout={closeLogEntryFlyout}
          onSetFieldFilter={setFilter}
          sourceId={sourceId}
        />
      ) : null}
      <PageContent key={`${sourceId}-${sourceConfiguration?.version}`}>
        <ScrollableLogTextStreamView
          columnConfigurations={
            (sourceConfiguration && sourceConfiguration.configuration.logColumns) || []
          }
          hasMoreAfterEnd={hasMoreAfterEnd}
          hasMoreBeforeStart={hasMoreBeforeStart}
          isLoadingMore={isLoadingMore}
          isReloading={isReloading}
          isStreaming={isStreaming}
          items={items}
          jumpToTarget={jumpToTargetPosition}
          lastLoadedTime={lastLoadedTime}
          reloadItems={checkForNewEntries}
          reportVisibleInterval={reportVisiblePositions}
          scale={textScale}
          target={targetPosition}
          wrap={textWrap}
          onOpenLogEntryFlyout={openLogEntryFlyout}
          setContextEntry={setContextEntry}
          highlightedItem={surroundingLogsId ? surroundingLogsId : null}
          currentHighlightKey={currentHighlightKey}
          startDateExpression={startDateExpression}
          endDateExpression={endDateExpression}
          updateDateRange={updateDateRange}
          startLiveStreaming={startLiveStreaming}
        />

        <AutoSizer content bounds detectAnyWindowResize="height">
          {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => {
            return (
              <LogPageMinimapColumn ref={measureRef}>
                <WithSummary>
                  {({ buckets, start, end }) => (
                    <LogMinimap
                      start={start}
                      end={end}
                      height={height}
                      width={width}
                      highlightedInterval={isReloading ? null : visibleTimeInterval}
                      jumpToTarget={jumpToTargetPosition}
                      summaryBuckets={buckets}
                      summaryHighlightBuckets={
                        logSummaryHighlights.length > 0 ? logSummaryHighlights[0].buckets : []
                      }
                      target={visibleMidpointTime}
                    />
                  )}
                </WithSummary>
              </LogPageMinimapColumn>
            );
          }}
        </AutoSizer>
      </PageContent>
    </>
  );
};

const LogPageMinimapColumn = euiStyled.div`
  flex: 1 0 0%;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;

const createLogEntryStreamItem = (
  logEntry: LogEntry,
  highlights: LogEntry[]
): LogEntryStreamItem => ({
  kind: 'logEntry' as 'logEntry',
  logEntry,
  highlights,
});
