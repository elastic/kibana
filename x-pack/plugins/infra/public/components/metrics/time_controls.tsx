/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { EuiSuperDatePicker, OnRefreshChangeProps, OnTimeChangeProps } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import euiStyled from '../../../../../common/eui_styled_components';
import { InfraTimerangeInput } from '../../graphql/types';

const EuiSuperDatePickerAbsoluteFormat = 'YYYY-MM-DDTHH:mm:ss.sssZ';

interface MetricsTimeControlsProps {
  currentTimeRange: InfraTimerangeInput;
  isLiveStreaming?: boolean;
  refreshInterval?: number | null;
  onChangeTimeRange: (time: InfraTimerangeInput) => void;
  setRefreshInterval: (refreshInterval: number) => void;
  setAutoReload: (isAutoReloading: boolean) => void;
}

export class MetricsTimeControls extends React.Component<MetricsTimeControlsProps> {
  public render() {
    const { currentTimeRange, isLiveStreaming, refreshInterval } = this.props;
    return (
      <MetricsTimeControlsContainer>
        <EuiSuperDatePicker
          start={moment(currentTimeRange.from).format(EuiSuperDatePickerAbsoluteFormat)}
          end={moment(currentTimeRange.to).format(EuiSuperDatePickerAbsoluteFormat)}
          isPaused={!isLiveStreaming}
          refreshInterval={refreshInterval ? refreshInterval : 0}
          onTimeChange={this.handleTimeChange}
          onRefreshChange={this.handleRefreshChange}
        />
      </MetricsTimeControlsContainer>
    );
  }

  private handleTimeChange = ({ start, end }: OnTimeChangeProps) => {
    const parsedStart = dateMath.parse(start);
    const parsedEnd = dateMath.parse(end);

    if (parsedStart && parsedEnd) {
      this.props.onChangeTimeRange({
        from: parsedStart.valueOf(),
        to: parsedEnd.valueOf(),
        interval: '>=1m',
      });
    }
  };

  private handleRefreshChange = ({ isPaused, refreshInterval }: OnRefreshChangeProps) => {
    if (isPaused) {
      this.props.setAutoReload(false);
    } else {
      this.props.setRefreshInterval(refreshInterval);
      this.props.setAutoReload(true);
    }
  };
}

const MetricsTimeControlsContainer = euiStyled.div`
  max-width: 750px;
`;
