/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';

import euiStyled from '../../../../../common/eui_styled_components';
import { AutoSizer } from '../../components/auto_sizer';
import { LogFlyout } from '../../components/logging/log_flyout';
import { LogMinimap } from '../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { PageContent } from '../../components/page';

import { WithSummary } from '../../containers/logs/log_summary';
import { LogViewConfiguration } from '../../containers/logs/log_view_configuration';
import { WithLogFilter, WithLogFilterUrlState } from '../../containers/logs/with_log_filter';
import {
  LogFlyout as LogFlyoutState,
  WithFlyoutOptionsUrlState,
} from '../../containers/logs/log_flyout';
import { WithLogMinimapUrlState } from '../../containers/logs/with_log_minimap';
import { WithLogPositionUrlState } from '../../containers/logs/with_log_position';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithLogTextviewUrlState } from '../../containers/logs/with_log_textview';
import { WithStreamItems } from '../../containers/logs/with_stream_items';
import { Source } from '../../containers/source';

import { LogsToolbar } from './page_toolbar';

export const LogsPageLogsContent: React.FunctionComponent = () => {
  const { derivedIndexPattern, sourceId, version } = useContext(Source.Context);
  const { intervalSize, textScale, textWrap } = useContext(LogViewConfiguration.Context);
  const {
    setFlyoutVisibility,
    flyoutVisible,
    setFlyoutId,
    surroundingLogsId,
    setSurroundingLogsId,
    flyoutItem,
    isLoading,
  } = useContext(LogFlyoutState.Context);

  return (
    <>
      <WithLogFilterUrlState indexPattern={derivedIndexPattern} />
      <WithLogPositionUrlState />
      <WithLogMinimapUrlState />
      <WithLogTextviewUrlState />
      <WithFlyoutOptionsUrlState />
      <LogsToolbar />
      <WithLogFilter indexPattern={derivedIndexPattern}>
        {({ applyFilterQueryFromKueryExpression }) => (
          <WithLogPosition>
            {({ jumpToTargetPosition, stopLiveStreaming }) =>
              flyoutVisible ? (
                <LogFlyout
                  setFilter={applyFilterQueryFromKueryExpression}
                  setTarget={(timeKey, flyoutItemId) => {
                    jumpToTargetPosition(timeKey);
                    setSurroundingLogsId(flyoutItemId);
                    stopLiveStreaming();
                  }}
                  setFlyoutVisibility={setFlyoutVisibility}
                  flyoutItem={flyoutItem}
                  loading={isLoading}
                />
              ) : null
            }
          </WithLogPosition>
        )}
      </WithLogFilter>
      <PageContent key={`${sourceId}-${version}`}>
        <WithLogPosition>
          {({ isAutoReloading, jumpToTargetPosition, reportVisiblePositions, targetPosition }) => (
            <WithStreamItems initializeOnMount={!isAutoReloading}>
              {({
                hasMoreAfterEnd,
                hasMoreBeforeStart,
                isLoadingMore,
                isReloading,
                items,
                lastLoadedTime,
                loadNewerEntries,
              }) => (
                <ScrollableLogTextStreamView
                  hasMoreAfterEnd={hasMoreAfterEnd}
                  hasMoreBeforeStart={hasMoreBeforeStart}
                  isLoadingMore={isLoadingMore}
                  isReloading={isReloading}
                  isStreaming={isAutoReloading}
                  items={items}
                  jumpToTarget={jumpToTargetPosition}
                  lastLoadedTime={lastLoadedTime}
                  loadNewerItems={loadNewerEntries}
                  reportVisibleInterval={reportVisiblePositions}
                  scale={textScale}
                  target={targetPosition}
                  wrap={textWrap}
                  setFlyoutItem={setFlyoutId}
                  setFlyoutVisibility={setFlyoutVisibility}
                  highlightedItem={surroundingLogsId ? surroundingLogsId : null}
                />
              )}
            </WithStreamItems>
          )}
        </WithLogPosition>
        <AutoSizer content>
          {({ measureRef, content: { width = 0, height = 0 } }) => {
            return (
              <LogPageMinimapColumn innerRef={measureRef}>
                <WithSummary>
                  {({ buckets }) => (
                    <WithLogPosition>
                      {({ jumpToTargetPosition, visibleMidpointTime, visibleTimeInterval }) => (
                        <LogMinimap
                          height={height}
                          width={width}
                          highlightedInterval={visibleTimeInterval}
                          intervalSize={intervalSize}
                          jumpToTarget={jumpToTargetPosition}
                          summaryBuckets={buckets}
                          target={visibleMidpointTime}
                        />
                      )}
                    </WithLogPosition>
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
