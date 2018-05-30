/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton } from '@elastic/eui';
import * as React from 'react';

interface LogLiveStreamControlsProps {
  className?: string;
  isLiveStreaming: boolean;
  enableLiveStreaming: () => any;
  disableLiveStreaming: () => any;
}

export class LogLiveStreamControls extends React.Component<
  LogLiveStreamControlsProps,
  {}
> {
  public startStreaming = () => {
    this.props.enableLiveStreaming();
  };

  public stopStreaming = () => {
    this.props.disableLiveStreaming();
  };

  public render() {
    const { className, isLiveStreaming } = this.props;

    if (isLiveStreaming) {
      return (
        <EuiButton
          className={className}
          color="secondary"
          fill
          iconType="pause"
          iconSide="left"
          onClick={this.stopStreaming}
          size="s"
        >
          Stop streaming
        </EuiButton>
      );
    } else {
      return (
        <EuiButton
          className={className}
          iconType="play"
          iconSide="left"
          onClick={this.startStreaming}
          size="s"
        >
          Stream live
        </EuiButton>
      );
    }
  }
}
