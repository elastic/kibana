/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { LogMinimap } from '../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { PageContent } from '../../components/page';
import { WithLogMinimap } from '../../containers/logs/with_log_minimap';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithLogTextview } from '../../containers/logs/with_log_textview';
import { WithStreamItems } from '../../containers/logs/with_stream_items';
import { WithSummary } from '../../containers/logs/with_summary';

export const LogsPageContent: React.SFC = () => (
  <PageContent>
    <AutoSizer content>
      {({ measureRef, content: { width = 0, height = 0 } }) => (
        <LogPageEventStreamColumn innerRef={measureRef}>
          <WithLogTextview>
            {({ textScale, wrap }) => (
              <WithLogPosition>
                {({
                  isAutoReloading,
                  jumpToTargetPosition,
                  reportVisiblePositions,
                  targetPosition,
                }) => (
                  <WithStreamItems>
                    {({
                      hasMoreAfterEnd,
                      hasMoreBeforeStart,
                      isLoadingMore,
                      isReloading,
                      items,
                      lastLoadedTime,
                    }) => (
                      <ScrollableLogTextStreamView
                        hasMoreAfterEnd={hasMoreAfterEnd}
                        hasMoreBeforeStart={hasMoreBeforeStart}
                        height={height}
                        isLoadingMore={isLoadingMore}
                        isReloading={isReloading}
                        isStreaming={isAutoReloading}
                        items={items}
                        jumpToTarget={jumpToTargetPosition}
                        lastLoadedTime={lastLoadedTime}
                        reportVisibleInterval={reportVisiblePositions}
                        scale={textScale}
                        target={targetPosition}
                        width={width}
                        wrap={wrap}
                      />
                    )}
                  </WithStreamItems>
                )}
              </WithLogPosition>
            )}
          </WithLogTextview>
        </LogPageEventStreamColumn>
      )}
    </AutoSizer>
    <AutoSizer content>
      {({ measureRef, content: { width = 0, height = 0 } }) => {
        return (
          <LogPageMinimapColumn innerRef={measureRef}>
            <WithLogMinimap>
              {({ intervalSize }) => (
                <WithSummary>
                  {({ buckets }) => (
                    <WithLogPosition>
                      {({
                        jumpToTargetPosition,
                        reportVisibleSummary,
                        visibleMidpointTime,
                        visibleTimeInterval,
                      }) => (
                        <LogMinimap
                          height={height}
                          width={width}
                          highlightedInterval={visibleTimeInterval}
                          intervalSize={intervalSize}
                          jumpToTarget={jumpToTargetPosition}
                          reportVisibleInterval={reportVisibleSummary}
                          summaryBuckets={buckets}
                          target={visibleMidpointTime}
                        />
                      )}
                    </WithLogPosition>
                  )}
                </WithSummary>
              )}
            </WithLogMinimap>
          </LogPageMinimapColumn>
        );
      }}
    </AutoSizer>
  </PageContent>
);

const LogPageEventStreamColumn = styled.div`
  flex: 1 0 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LogPageMinimapColumn = styled.div`
  flex: 1 0 0;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;
