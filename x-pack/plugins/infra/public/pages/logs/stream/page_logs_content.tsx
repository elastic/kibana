/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext, useCallback } from 'react';
import { euiStyled } from '../../../../../observability/public';
import { AutoSizer } from '../../../components/auto_sizer';
import { LogEntryFlyout } from '../../../components/logging/log_entry_flyout';
import { LogMinimap } from '../../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../../components/logging/log_text_stream';
import { PageContent } from '../../../components/page';
import { LogFilterState } from '../../../containers/logs/log_filter';
import {
  LogFlyout as LogFlyoutState,
  WithFlyoutOptionsUrlState,
} from '../../../containers/logs/log_flyout';
import { LogHighlightsState } from '../../../containers/logs/log_highlights';
import { LogPositionState } from '../../../containers/logs/log_position';
import { useLogSourceContext } from '../../../containers/logs/log_source';
import { WithSummary } from '../../../containers/logs/log_summary';
import { LogViewConfiguration } from '../../../containers/logs/log_view_configuration';
import { ViewLogInContext } from '../../../containers/logs/view_log_in_context';
import { WithLogTextviewUrlState } from '../../../containers/logs/with_log_textview';
import { WithStreamItems } from '../../../containers/logs/with_stream_items';
import { LogsToolbar } from './page_toolbar';
import { PageViewLogInContext } from './page_view_log_in_context';

export const LogsPageLogsContent: React.FunctionComponent = () => {
  const { sourceConfiguration, sourceId } = useLogSourceContext();
  const { textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const {
    setFlyoutVisibility,
    flyoutVisible,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
    flyoutItem,
    isLoading,
  } = useContext(LogFlyoutState.Context);
  const { logSummaryHighlights } = useContext(LogHighlightsState.Context);
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
      {flyoutVisible ? (
        <LogEntryFlyout
          setFilter={setFilter}
          setFlyoutVisibility={setFlyoutVisibility}
          flyoutItem={flyoutItem}
          loading={isLoading}
        />
      ) : null}
      <PageContent key={`${sourceId}-${sourceConfiguration?.version}`}>
        <WithStreamItems>
          {({
            currentHighlightKey,
            hasMoreAfterEnd,
            hasMoreBeforeStart,
            isLoadingMore,
            isReloading,
            items,
            lastLoadedTime,
            fetchNewerEntries,
            checkForNewEntries,
          }) => (
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
              loadNewerItems={fetchNewerEntries}
              reloadItems={checkForNewEntries}
              reportVisibleInterval={reportVisiblePositions}
              scale={textScale}
              target={targetPosition}
              wrap={textWrap}
              setFlyoutItem={setFlyoutId}
              setFlyoutVisibility={setFlyoutVisibility}
              setContextEntry={setContextEntry}
              highlightedItem={surroundingLogsId ? surroundingLogsId : null}
              currentHighlightKey={currentHighlightKey}
              startDateExpression={startDateExpression}
              endDateExpression={endDateExpression}
              updateDateRange={updateDateRange}
              startLiveStreaming={startLiveStreaming}
            />
          )}
        </WithStreamItems>

        <AutoSizer content bounds detectAnyWindowResize="height">
          {({ measureRef, bounds: { height = 0 }, content: { width = 0 } }) => {
            return (
              <LogPageMinimapColumn ref={measureRef}>
                <WithSummary>
                  {({ buckets, start, end }) => (
                    <WithStreamItems>
                      {({ isReloading }) => (
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
                    </WithStreamItems>
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
