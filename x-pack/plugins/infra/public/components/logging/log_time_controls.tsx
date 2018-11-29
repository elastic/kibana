/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePicker, EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import moment, { Moment } from 'moment';
import React from 'react';
import styled from 'styled-components';

const noop = () => undefined;

interface LogTimeControlsProps {
  currentTime: number | null;
  startLiveStreaming: (interval: number) => any;
  stopLiveStreaming: () => any;
  isLiveStreaming: boolean;
  jumpToTime: (time: number) => any;
}

export class LogTimeControls extends React.PureComponent<LogTimeControlsProps> {
  public render() {
    const { currentTime, isLiveStreaming } = this.props;

    const currentMoment = currentTime ? moment(currentTime) : null;

    if (isLiveStreaming) {
      return (
        <EuiFilterGroup>
          <InlineWrapper>
            <EuiDatePicker disabled onChange={noop} value="streaming..." />
          </InlineWrapper>
          <EuiFilterButton
            color="primary"
            iconType="pause"
            iconSide="left"
            onClick={this.stopLiveStreaming}
          >
            <FormattedMessage
              id="xpack.infra.logs.stopStreamingButtonLabel"
              defaultMessage="Stop streaming"
            />
          </EuiFilterButton>
        </EuiFilterGroup>
      );
    } else {
      return (
        <EuiFilterGroup>
          <InlineWrapper>
            <EuiDatePicker
              dateFormat="L LTS"
              onChange={this.handleChangeDate}
              popperPlacement="top-end"
              selected={currentMoment}
              shouldCloseOnSelect
              showTimeSelect
              timeFormat="LTS"
              injectTimes={currentMoment ? [currentMoment] : []}
            />
          </InlineWrapper>
          <EuiFilterButton iconType="play" iconSide="left" onClick={this.startLiveStreaming}>
            <FormattedMessage
              id="xpack.infra.logs.startStreamingButtonLabel"
              defaultMessage="Stream live"
            />
          </EuiFilterButton>
        </EuiFilterGroup>
      );
    }
  }

  private handleChangeDate = (date: Moment | null) => {
    if (date !== null) {
      this.props.jumpToTime(date.valueOf());
    }
  };

  private startLiveStreaming = () => {
    this.props.startLiveStreaming(5000);
  };

  private stopLiveStreaming = () => {
    this.props.stopLiveStreaming();
  };
}

const InlineWrapper = styled.div`
  display: inline-block;
`;
