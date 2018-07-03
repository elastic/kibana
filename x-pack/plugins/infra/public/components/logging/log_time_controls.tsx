/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePicker, EuiFilterButton, EuiFilterGroup } from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';
import styled from 'styled-components';

const noop = () => undefined;

interface LogTimeControlsProps {
  currentTime: number;
  disableLiveStreaming: () => any;
  enableLiveStreaming: () => any;
  isLiveStreaming: boolean;
  jumpToTime: (time: number) => any;
}

export class LogTimeControls extends React.PureComponent<LogTimeControlsProps> {
  public render() {
    const {
      currentTime,
      disableLiveStreaming,
      enableLiveStreaming,
      isLiveStreaming,
    } = this.props;

    const currentMoment = moment(currentTime);

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
            onClick={disableLiveStreaming}
          >
            Stop streaming
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
              injectTimes={[currentMoment]}
            />
          </InlineWrapper>
          <EuiFilterButton
            iconType="play"
            iconSide="left"
            onClick={enableLiveStreaming}
          >
            Stream live
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
}

const InlineWrapper = styled.div`
  display: inline-block;
`;
