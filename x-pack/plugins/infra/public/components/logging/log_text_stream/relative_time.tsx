/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { decomposeIntoUnits, getLabelOfScale, TimeUnit } from '../../../../common/time';

interface RelativeTimeProps {
  time: number;
  refreshInterval?: number;
}

interface RelativeTimeState {
  currentTime: number;
  timeoutId: number | null;
}

export class RelativeTime extends React.Component<RelativeTimeProps, RelativeTimeState> {
  public readonly state = {
    currentTime: Date.now(),
    timeoutId: null,
  };

  public updateCurrentTimeEvery = (refreshInterval: number) => {
    const nextTimeoutId = window.setTimeout(
      this.updateCurrentTimeEvery.bind(this, refreshInterval),
      refreshInterval
    );

    this.setState({
      currentTime: Date.now(),
      timeoutId: nextTimeoutId,
    });
  };

  public cancelUpdate = () => {
    const { timeoutId } = this.state;

    if (timeoutId) {
      window.clearTimeout(timeoutId);
      this.setState({
        timeoutId: null,
      });
    }
  };

  public componentDidMount() {
    const { refreshInterval } = this.props;

    if (refreshInterval && refreshInterval > 0) {
      this.updateCurrentTimeEvery(refreshInterval);
    }
  }

  public componentWillUnmount() {
    this.cancelUpdate();
  }

  public render() {
    const { time } = this.props;
    const { currentTime } = this.state;
    const timeDifference = Math.abs(currentTime - time);

    const timeFragments = decomposeIntoUnits(timeDifference, unitThresholds);

    if (timeFragments.length === 0) {
      return '0s';
    } else {
      return timeFragments.map(getLabelOfScale).join(' ');
    }
  }
}

const unitThresholds = [TimeUnit.Day, TimeUnit.Hour, TimeUnit.Minute, TimeUnit.Second];
