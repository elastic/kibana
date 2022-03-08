/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer } from '@elastic/eui';
import type { Query } from '@kbn/es-query';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import usePrevious from 'react-use/lib/usePrevious';
import { euiStyled } from '../../../../../../../src/plugins/kibana_react/common';
import { LogEntry } from '../../../../common/log_entry';
import { TimeKey } from '../../../../common/time';
import { AutoSizer } from '../../../components/auto_sizer';
import { LogEntryFlyout } from '../../../components/logging/log_entry_flyout';
import { LogMinimap } from '../../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { LogEntryStreamItem } from '../../../components/logging/log_text_stream/item';
import { PageContent } from '../../../components/page';
import { LogFilterState } from '../../../containers/logs/log_filter';
import {
  useLogEntryFlyoutContext,
  WithFlyoutOptionsUrlState,
} from '../../../containers/logs/log_flyout';
import { LogHighlightsState } from '../../../containers/logs/log_highlights';
import { LogPositionState } from '../../../containers/logs/log_position';
import { useLogStreamContext } from '../../../containers/logs/log_stream';
import { WithSummary } from '../../../containers/logs/log_summary';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { WithLogTextviewUrlState } from '../../../containers/logs/with_log_textview';
import { useLogViewContext } from '../../../hooks/use_log_view';
import { datemathToEpochMillis, isValidDatemath } from '../../../utils/datemath';
import { LogsToolbar } from './page_toolbar';
import { PageViewLogInContext } from './page_view_log_in_context';

const PAGE_THRESHOLD = 2;

export const LogsPageLogsContent: React.FunctionComponent = () => {
  const { resolvedLogView, logView, logViewId } = useLogViewContext();
  const { textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const {
    surroundingLogsId,
    setSurroundingLogsId,
    closeFlyout: closeLogEntryFlyout,
    openFlyout: openLogEntryFlyout,
    isFlyoutOpen,
    logEntryId: flyoutLogEntryId,
  } = useLogEntryFlyoutContext();

  const {
    startTimestamp,
    endTimestamp,
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
    lastCompleteDateRangeExpressionUpdate,
  } = useContext(LogPositionState.Context);
  const { filterQuery, applyLogFilterQuery } = useContext(LogFilterState.Context);

  const {
    isReloading,
    entries,
    topCursor,
    bottomCursor,
    hasMoreAfter: hasMoreAfterEnd,
    hasMoreBefore: hasMoreBeforeStart,
    isLoadingMore,
    lastLoadedTime,
    fetchEntries,
    fetchPreviousEntries,
    fetchNextEntries,
    fetchNewestEntries,
  } = useLogStreamContext();

  const prevStartTimestamp = usePrevious(startTimestamp);
  const prevEndTimestamp = usePrevious(endTimestamp);
  const prevFilterQuery = usePrevious(filterQuery);
  const prevLastCompleteDateRangeExpressionUpdate = usePrevious(
    lastCompleteDateRangeExpressionUpdate
  );

  // Refetch entries if...
  useEffect(() => {
    const isFirstLoad = !prevStartTimestamp || !prevEndTimestamp;

    const completeDateRangeExpressionHasChanged =
      lastCompleteDateRangeExpressionUpdate !== prevLastCompleteDateRangeExpressionUpdate;

    const isCenterPointOutsideLoadedRange =
      targetPosition != null &&
      ((topCursor != null && targetPosition.time < topCursor.time) ||
        (bottomCursor != null && targetPosition.time > bottomCursor.time));

    const hasQueryChanged = filterQuery !== prevFilterQuery;

    if (
      isFirstLoad ||
      completeDateRangeExpressionHasChanged ||
      isCenterPointOutsideLoadedRange ||
      hasQueryChanged
    ) {
      if (isStreaming) {
        fetchNewestEntries();
      } else {
        fetchEntries();
      }
    }
  }, [
    fetchEntries,
    fetchNewestEntries,
    isStreaming,
    prevStartTimestamp,
    prevEndTimestamp,
    startTimestamp,
    endTimestamp,
    targetPosition,
    topCursor,
    bottomCursor,
    filterQuery,
    prevFilterQuery,
    lastCompleteDateRangeExpressionUpdate,
    prevLastCompleteDateRangeExpressionUpdate,
  ]);

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

  const [, { setContextEntry }] = useContext(ViewLogInContext.Context);

  const handleDateRangeExtension = useCallback(
    (newDateRange) => {
      updateDateRange(newDateRange);

      if (
        'startDateExpression' in newDateRange &&
        isValidDatemath(newDateRange.startDateExpression)
      ) {
        fetchPreviousEntries({
          force: true,
          extendTo: datemathToEpochMillis(newDateRange.startDateExpression)!,
        });
      }
      if ('endDateExpression' in newDateRange && isValidDatemath(newDateRange.endDateExpression)) {
        fetchNextEntries({
          force: true,
          extendTo: datemathToEpochMillis(newDateRange.endDateExpression)!,
        });
      }
    },
    [updateDateRange, fetchPreviousEntries, fetchNextEntries]
  );

  const handlePagination = useCallback(
    (params) => {
      reportVisiblePositions(params);
      if (!params.fromScroll) {
        return;
      }

      if (isLoadingMore) {
        return;
      }

      if (params.pagesBeforeStart < PAGE_THRESHOLD) {
        fetchPreviousEntries();
      } else if (params.pagesAfterEnd < PAGE_THRESHOLD) {
        fetchNextEntries();
      }
    },
    [reportVisiblePositions, isLoadingMore, fetchPreviousEntries, fetchNextEntries]
  );

  const setFilter = useCallback(
    (filter: Query, flyoutItemId: string, timeKey: TimeKey | undefined | null) => {
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
      <EuiSpacer size="m" />
      <PageViewLogInContext />
      {isFlyoutOpen ? (
        <LogEntryFlyout
          logEntryId={flyoutLogEntryId}
          onCloseFlyout={closeLogEntryFlyout}
          onSetFieldFilter={setFilter}
          sourceId={logViewId}
        />
      ) : null}
      <PageContent key={`${logViewId}-${logView?.version}`}>
        <ScrollableLogTextStreamView
          columnConfigurations={(resolvedLogView && resolvedLogView.columns) || []}
          hasMoreAfterEnd={hasMoreAfterEnd}
          hasMoreBeforeStart={hasMoreBeforeStart}
          isLoadingMore={isLoadingMore}
          isReloading={isReloading}
          isStreaming={isStreaming}
          items={items}
          jumpToTarget={jumpToTargetPosition}
          lastLoadedTime={lastLoadedTime}
          reloadItems={fetchEntries}
          reportVisibleInterval={handlePagination}
          scale={textScale}
          target={targetPosition}
          wrap={textWrap}
          onOpenLogEntryFlyout={openLogEntryFlyout}
          setContextEntry={setContextEntry}
          highlightedItem={surroundingLogsId ? surroundingLogsId : null}
          currentHighlightKey={currentHighlightKey}
          startDateExpression={startDateExpression}
          endDateExpression={endDateExpression}
          updateDateRange={handleDateRangeExtension}
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
