/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useContext } from 'react';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { LogMinimap } from '../../components/logging/log_minimap';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { PageContent } from '../../components/page';
import { LogViewConfiguration } from '../../containers/logs/log_view_configuration';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithStreamItems } from '../../containers/logs/with_stream_items';
import { WithSummary } from '../../containers/logs/with_summary';

interface Props {
  setFlyoutItem: (id: string) => void;
  showFlyout: () => void;
}

export const LogsPageContent: React.FunctionComponent<Props> = ({ showFlyout, setFlyoutItem }) => {
  const { intervalSize, textScale, textWrap } = useContext(LogViewConfiguration.Context);

  return (
    <PageContent>
      <AutoSizer content>
        {({ measureRef, content: { width = 0, height = 0 } }) => (
          <LogPageEventStreamColumn innerRef={measureRef}>
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
                    loadNewerEntries,
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
                      loadNewerItems={loadNewerEntries}
                      reportVisibleInterval={reportVisiblePositions}
                      scale={textScale}
                      target={targetPosition}
                      width={width}
                      wrap={textWrap}
                      setFlyoutItem={setFlyoutItem}
                      showFlyout={showFlyout}
                    />
                  )}
                </WithStreamItems>
              )}
            </WithLogPosition>
          </LogPageEventStreamColumn>
        )}
      </AutoSizer>
      <AutoSizer content>
        {({ measureRef, content: { width = 0, height = 0 } }) => {
          return (
            <LogPageMinimapColumn innerRef={measureRef}>
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
            </LogPageMinimapColumn>
          );
        }}
      </AutoSizer>
    </PageContent>
  );
};

const LogPageEventStreamColumn = styled.div`
  flex: 1 0 0%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const LogPageMinimapColumn = styled.div`
  flex: 1 0 0%;
  overflow: hidden;
  min-width: 100px;
  max-width: 100px;
  display: flex;
  flex-direction: column;
`;
