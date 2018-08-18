/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { AutoSizer } from '../../components/auto_sizer';
import { Toolbar } from '../../components/eui';
import { Header } from '../../components/header';
import { LogCustomizationMenu } from '../../components/logging/log_customization_menu';
import { LogMinimap } from '../../components/logging/log_minimap';
import { LogMinimapScaleControls } from '../../components/logging/log_minimap_scale_controls';
import { LogPositionText } from '../../components/logging/log_position_text';
// import { LogSearchControls } from '../../components/logging/log_search_controls';
// import { LogStatusbar, LogStatusbarItem } from '../../components/logging/log_statusbar';
import { LogTextScaleControls } from '../../components/logging/log_text_scale_controls';
import { ScrollableLogTextStreamView } from '../../components/logging/log_text_stream';
import { LogTextWrapControls } from '../../components/logging/log_text_wrap_controls';
import { LogTimeControls } from '../../components/logging/log_time_controls';

// import { withLogSearchControlsProps } from '../../containers/logging_legacy/with_log_search_controls_props';
import { WithStreamItems } from '../../containers/logging_legacy/with_stream_items';
import { WithSummary } from '../../containers/logging_legacy/with_summary';
import { WithTextScale } from '../../containers/logging_legacy/with_text_scale_controls_props';
import { WithTextStreamPosition } from '../../containers/logging_legacy/with_text_stream_position';
import { WithTextWrap } from '../../containers/logging_legacy/with_text_wrap_controls_props';
import { WithTimeControls } from '../../containers/logging_legacy/with_time_controls_props';
import { withVisibleLogEntries } from '../../containers/logging_legacy/with_visible_log_entries';

const ConnectedLogPositionText = withVisibleLogEntries(LogPositionText);
// const ConnectedLogSearchControls = withLogSearchControlsProps(LogSearchControls);

interface InnerLogsPageProps {
  jumpToTime: (time: number) => void;
}

class InnerLogsPage extends React.PureComponent<InnerLogsPageProps> {
  public componentDidMount() {
    this.props.jumpToTime(Date.now());
  }

  public render() {
    return (
      <ColumnarPage>
        <Header breadcrumbs={[{ text: 'Logs' }]} />
        <Toolbar>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween" gutterSize="none">
            <EuiFlexItem>
              <ConnectedLogPositionText />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <LogCustomizationMenu>
                <WithSummary>
                  {({ availableIntervalSizes, configureSummary, intervalSize }) => (
                    <LogMinimapScaleControls
                      availableIntervalSizes={availableIntervalSizes}
                      configureSummary={configureSummary}
                      intervalSize={intervalSize}
                    />
                  )}
                </WithSummary>
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
              <WithTimeControls>
                {({
                  currentTime,
                  isLiveStreaming,
                  jumpToTargetPositionTime,
                  startLiveStreaming,
                  stopLiveStreaming,
                }) => (
                  <LogTimeControls
                    currentTime={currentTime}
                    isLiveStreaming={isLiveStreaming}
                    jumpToTime={jumpToTargetPositionTime}
                    startLiveStreaming={startLiveStreaming}
                    stopLiveStreaming={stopLiveStreaming}
                  />
                )}
              </WithTimeControls>
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
                        <WithStreamItems>
                          {streamItemsProps => (
                            <ScrollableLogTextStreamView
                              scale={textScale}
                              wrap={wrap}
                              height={height}
                              width={width}
                              {...streamItemsProps}
                            />
                          )}
                        </WithStreamItems>
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
                  <WithSummary>
                    {({ buckets, intervalSize, reportVisibleInterval }) => (
                      <WithTextStreamPosition>
                        {({ jumpToPosition, visibleMidpoint, visibleTimeInterval }) => (
                          <LogMinimap
                            height={height}
                            width={width}
                            highlightedInterval={visibleTimeInterval}
                            intervalSize={intervalSize}
                            jumpToTarget={jumpToPosition}
                            reportVisibleInterval={reportVisibleInterval}
                            summaryBuckets={buckets}
                            target={visibleMidpoint}
                          />
                        )}
                      </WithTextStreamPosition>
                    )}
                  </WithSummary>
                </LogPageMinimapColumn>
              );
            }}
          </AutoSizer>
        </LogPageContent>
        {/*<LogStatusbar>
          <LogStatusbarItem>
            <ConnectedLogSearchControls />
          </LogStatusbarItem>
        </LogStatusbar>*/}
      </ColumnarPage>
    );
  }
}

export const LogsPage = () => (
  <WithTimeControls>
    {({ jumpToTargetPositionTime }) => <InnerLogsPage jumpToTime={jumpToTargetPositionTime} />}
  </WithTimeControls>
);

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
