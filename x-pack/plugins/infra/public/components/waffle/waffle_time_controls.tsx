/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty, EuiDatePicker, EuiFormControlLayout } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React from 'react';

interface WaffleTimeControlsProps {
  currentTime: number;
  isLiveStreaming?: boolean;
  onChangeTime?: (time: number) => void;
  startLiveStreaming?: () => void;
  stopLiveStreaming?: () => void;
}

export class WaffleTimeControls extends React.Component<WaffleTimeControlsProps> {
  public render() {
    const { currentTime, isLiveStreaming } = this.props;

    const currentMoment = moment(currentTime);

    const liveStreamingButton = isLiveStreaming ? (
      <EuiButtonEmpty
        color="primary"
        iconSide="left"
        iconType="pause"
        onClick={this.stopLiveStreaming}
      >
        <FormattedMessage
          id="xpack.infra.waffleTime.stopRefreshingButtonLabel"
          defaultMessage="Stop refreshing"
        />
      </EuiButtonEmpty>
    ) : (
      <EuiButtonEmpty iconSide="left" iconType="play" onClick={this.startLiveStreaming}>
        <FormattedMessage
          id="xpack.infra.waffleTime.autoRefreshButtonLabel"
          defaultMessage="Auto-refresh"
        />
      </EuiButtonEmpty>
    );

    return (
      <EuiFormControlLayout append={liveStreamingButton} data-test-subj="waffleDatePicker">
        <EuiDatePicker
          className="euiFieldText--inGroup"
          dateFormat="L LTS"
          disabled={isLiveStreaming}
          injectTimes={currentMoment ? [currentMoment] : []}
          isLoading={isLiveStreaming}
          onChange={this.handleChangeDate}
          popperPlacement="top-end"
          selected={currentMoment}
          shouldCloseOnSelect
          showTimeSelect
          timeFormat="LT"
        />
      </EuiFormControlLayout>
    );
  }

  private handleChangeDate = (time: Moment | null) => {
    const { onChangeTime } = this.props;

    if (onChangeTime && time) {
      onChangeTime(time.valueOf());
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
