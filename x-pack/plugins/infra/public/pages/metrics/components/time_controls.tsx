/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker, OnRefreshChangeProps, OnTimeChangeProps } from '@elastic/eui';
import React from 'react';
import euiStyled from '../../../../../../common/eui_styled_components';
import { MetricsTimeInput } from '../containers/with_metrics_time';

interface MetricsTimeControlsProps {
  currentTimeRange: MetricsTimeInput;
  isLiveStreaming?: boolean;
  refreshInterval?: number | null;
  onChangeTimeRange: (time: MetricsTimeInput) => void;
  setRefreshInterval: (refreshInterval: number) => void;
  setAutoReload: (isAutoReloading: boolean) => void;
  onRefresh: () => void;
}

export class MetricsTimeControls extends React.Component<MetricsTimeControlsProps> {
  public render() {
    const { currentTimeRange, isLiveStreaming, refreshInterval } = this.props;
    return (
      <MetricsTimeControlsContainer>
        <EuiSuperDatePicker
          start={currentTimeRange.from}
          end={currentTimeRange.to}
          isPaused={!isLiveStreaming}
          refreshInterval={refreshInterval ? refreshInterval : 0}
          onTimeChange={this.handleTimeChange}
          onRefreshChange={this.handleRefreshChange}
          onRefresh={this.props.onRefresh}
        />
      </MetricsTimeControlsContainer>
    );
  }

  private handleTimeChange = ({ start, end }: OnTimeChangeProps) => {
    this.props.onChangeTimeRange({
      from: start,
      to: end,
      interval: '>=1m',
    });
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
