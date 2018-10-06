/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';
import styled from 'styled-components';

import { RangeDatePicker, RecentlyUsed } from '../range_date_picker';

import { metricTimeActions } from '../../store';

interface MetricsTimeControlsProps {
  currentTimeRange: metricTimeActions.MetricRangeTimeState;
  isLiveStreaming?: boolean;
  onChangeRangeTime?: (time: metricTimeActions.MetricRangeTimeState) => void;
  startLiveStreaming?: () => void;
  stopLiveStreaming?: () => void;
}

interface MetricsTimeControlsState {
  showGoButton: boolean;
  to: moment.Moment | undefined;
  from: moment.Moment | undefined;
  recentlyUsed: RecentlyUsed[];
}

export class MetricsTimeControls extends React.Component<
  MetricsTimeControlsProps,
  MetricsTimeControlsState
> {
  public readonly state = {
    showGoButton: false,
    to: moment().millisecond(this.props.currentTimeRange.to),
    from: moment().millisecond(this.props.currentTimeRange.from),
    recentlyUsed: [],
  };
  public render() {
    const { currentTimeRange, isLiveStreaming } = this.props;
    const { showGoButton, to, from, recentlyUsed } = this.state;

    const liveStreamingButton = isLiveStreaming ? (
      <EuiButtonEmpty
        color="primary"
        iconSide="left"
        iconType="pause"
        onClick={this.stopLiveStreaming}
      >
        Stop refreshing
      </EuiButtonEmpty>
    ) : (
      <EuiButtonEmpty iconSide="left" iconType="play" onClick={this.startLiveStreaming}>
        Auto-refresh
      </EuiButtonEmpty>
    );

    const goColor = from && to && from > to ? 'danger' : 'primary';
    const appendButton = showGoButton ? (
      <EuiButton color={goColor} fill onClick={this.searchRangeTime}>
        Go
      </EuiButton>
    ) : (
      liveStreamingButton
    );

    return (
      <MetricsTimeControlsContainer>
        <RangeDatePicker
          startDate={moment(currentTimeRange.from)}
          endDate={moment(currentTimeRange.to)}
          onChangeRangeTime={this.handleChangeDate}
          isLoading={isLiveStreaming}
          disabled={isLiveStreaming}
          recentlyUsed={recentlyUsed}
        />
        {appendButton}
      </MetricsTimeControlsContainer>
    );
  }

  private handleChangeDate = (
    from: Moment | undefined,
    to: Moment | undefined,
    search: boolean
  ) => {
    const { onChangeRangeTime } = this.props;
    const duration = moment.duration(from && to ? from.diff(to) : 0);
    const milliseconds = duration.asMilliseconds();
    if (to && from && onChangeRangeTime && search && to > from) {
      this.setState({
        showGoButton: false,
        to,
        from,
      });
      onChangeRangeTime({
        to: to && to.valueOf(),
        from: from && from.valueOf(),
      } as metricTimeActions.MetricRangeTimeState);
    } else if (milliseconds !== 0) {
      this.setState({
        showGoButton: true,
        to,
        from,
      });
    }
  };

  private searchRangeTime = () => {
    const { onChangeRangeTime } = this.props;
    const { to, from, recentlyUsed } = this.state;
    if (to && from && onChangeRangeTime && to > from) {
      this.setState({
        ...this.state,
        showGoButton: false,
        recentlyUsed: [
          ...recentlyUsed,
          ...[
            {
              type: 'date-range',
              text: [from.format('L LTS'), to.format('L LTS')],
            },
          ],
        ],
      });
      onChangeRangeTime({
        to: to.valueOf(),
        from: from.valueOf(),
      } as metricTimeActions.MetricRangeTimeState);
    }
  };

  private startLiveStreaming = () => {
    const { startLiveStreaming } = this.props;

    if (startLiveStreaming) {
      startLiveStreaming();
    }
  };

  private stopLiveStreaming = () => {
    const { stopLiveStreaming } = this.props;

    if (stopLiveStreaming) {
      stopLiveStreaming();
    }
  };
}
const MetricsTimeControlsContainer = styled.div`
  display: flex;
  justify-content: right;
  flex-flow: row wrap;
`;
