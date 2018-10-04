/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiFormControlLayout } from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';

import { RangeDatePicker } from '../range_date_picker';

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
  to: moment.Moment;
  from: moment.Moment;
}

export class MetricsTimeControls extends React.Component<
  MetricsTimeControlsProps,
  MetricsTimeControlsState
> {
  public readonly state = {
    showGoButton: false,
    to: moment().millisecond(this.props.currentTimeRange.to),
    from: moment().millisecond(this.props.currentTimeRange.from),
  };
  public render() {
    const { currentTimeRange, isLiveStreaming } = this.props;
    const { showGoButton } = this.state;

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

    const appendButton = showGoButton ? (
      <EuiButton color="primary" fill onClick={this.searchRangeTime} />
    ) : (
      liveStreamingButton
    );

    return (
      <EuiFormControlLayout append={appendButton}>
        <RangeDatePicker
          startDate={moment().millisecond(currentTimeRange.to)}
          endDate={moment().millisecond(currentTimeRange.from)}
          onChangeRangeTime={this.handleChangeDate}
        />
      </EuiFormControlLayout>
    );
  }

  private handleChangeDate = (to: Moment, from: Moment, search: boolean) => {
    const { onChangeRangeTime } = this.props;
    const duration = moment.duration(to.diff(from));
    const milliseconds = duration.asMilliseconds();
    if (onChangeRangeTime && search) {
      this.setState({
        showGoButton: false,
        to,
        from,
      });
      onChangeRangeTime({
        to: to.valueOf(),
        from: from.valueOf(),
      } as metricTimeActions.MetricRangeTimeState);
    } else if (milliseconds > 0) {
      this.setState({
        showGoButton: true,
        to,
        from,
      });
    }
  };

  private searchRangeTime = () => {
    const { onChangeRangeTime } = this.props;
    if (onChangeRangeTime) {
      this.setState({
        ...this.state,
        showGoButton: false,
      });
      onChangeRangeTime({
        to: this.state.to.valueOf(),
        from: this.state.from.valueOf(),
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
