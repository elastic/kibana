/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { AutocompleteField } from '../../components/autocomplete_field';
import { Toolbar } from '../../components/eui';
import { Header } from '../../components/header';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimap } from '../../components/logging/log_minimap';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';

import { WithLogFilter } from '../../containers/logs/with_log_filter';
import { WithLogMinimap } from '../../containers/logs/with_log_minimap';
import { WithLogPosition } from '../../containers/logs/with_log_position';
import { WithStreamItems } from '../../containers/logs/with_stream_items';
import { WithSummary } from '../../containers/logs/with_summary';
import { WithTextScale } from '../../containers/logs/with_text_scale_controls_props';
import { WithTextWrap } from '../../containers/logs/with_text_wrap_controls_props';
import { WithKueryAutocompletion } from '../../containers/with_kuery_autocompletion';

export class LogsPage extends React.Component {
  public render() {
    return (
      <ColumnarPage>
        <Header breadcrumbs={[{ text: 'Logs' }]} />
        <Toolbar>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
            <EuiFlexItem>
              <WithKueryAutocompletion>
                {({ isLoadingSuggestions, loadSuggestions, suggestions }) => (
                  <WithLogFilter>
                    {({
                      applyFilterQueryFromKueryExpression,
                      filterQuery,
                      isFilterQueryValid,
                      setFilterQueryFromKueryExpression,
                    }) => (
                      <AutocompleteField
                        isLoadingSuggestions={isLoadingSuggestions}
                        isValid={isFilterQueryValid}
                        loadSuggestions={loadSuggestions}
                        onChange={setFilterQueryFromKueryExpression}
                        onSubmit={applyFilterQueryFromKueryExpression}
                        placeholder="Search for log entries... (e.g. host.name:host-1)"
                        suggestions={suggestions}
                        value={filterQuery ? filterQuery.expression : ''}
                      />
                    )}
                  </WithLogFilter>
                )}
              </WithKueryAutocompletion>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LogCustomizationMenu>
                <WithLogMinimap>
                  {({ availableIntervalSizes, intervalSize, setIntervalSize }) => (
                    <LogMinimapScaleControls
                      availableIntervalSizes={availableIntervalSizes}
                      setIntervalSize={setIntervalSize}
                      intervalSize={intervalSize}
                    />
                  )}
                </WithLogMinimap>
                <WithTextWrap>
                  {({ wrap, setTextWrap }) => (
                    <LogTextWrapControls wrap={wrap} setTextWrap={setTextWrap} />
                  )}
                </WithTextWrap>
                <WithTextScale>
                  {({ availableTextScales, textScale, setTextScale }) => (
                    <LogTextScaleControls
                      availableTextScales={availableTextScales}
                      textScale={textScale}
                      setTextScale={setTextScale}
                    />
                  )}
                </WithTextScale>
              </LogCustomizationMenu>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <WithLogPosition>
                {({
                  visibleMidpoint,
                  isAutoReloading,
                  jumpToTargetPositionTime,
                  startLiveStreaming,
                  stopLiveStreaming,
                }) => (
                  <LogTimeControls
                    currentTime={visibleMidpoint}
                    isLiveStreaming={isAutoReloading}
                    jumpToTime={jumpToTargetPositionTime}
                    startLiveStreaming={startLiveStreaming}
                    stopLiveStreaming={stopLiveStreaming}
                  />
                )}
              </WithLogPosition>
            </EuiFlexItem>
          </EuiFlexGroup>
        </Toolbar>
        <LogPageContent>
          <AutoSizer content>
            {({ measureRef, content: { width = 0, height = 0 } }) => (
              <LogPageEventStreamColumn innerRef={measureRef as any}>
                <WithTextScale>
                  {({ textScale }) => (
                    <WithTextWrap>
                      {({ wrap }) => (
                        <WithLogPosition initializeOnMount>
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
                    </WithTextWrap>
                  )}
                </WithTextScale>
              </LogPageEventStreamColumn>
            )}
          </AutoSizer>
          <AutoSizer content>
            {({ measureRef, content: { width = 0, height = 0 } }) => {
              return (
                <LogPageMinimapColumn innerRef={measureRef as any}>
                  <WithLogMinimap>
                    {({ intervalSize }) => (
                      <WithSummary>
                        {({ buckets }) => (
                          <WithLogPosition>
                            {({
                              jumpToTargetPosition,
                              reportVisibleSummary,
                              visibleMidpoint,
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
                                target={visibleMidpoint}
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
        </LogPageContent>
      </ColumnarPage>
    );
  }
}

const LogPageContent = styled.div`
  flex: 1 0 0;
  display: flex;
  flex-direction: row;
  background-color: ${props => props.theme.eui.euiColorEmptyShade};
`;

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

const ColumnarPage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  flex: 1 0 0;
`;
