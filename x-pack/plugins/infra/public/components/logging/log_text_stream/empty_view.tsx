/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import * as React from 'react';

import { LogTextStreamStaticContentPanel, LogTextStreamStaticPanel } from './static_panel';

interface LogTextStreamEmptyViewProps {
  height: number;
  width: number;
  reload: () => void;
}

export class LogTextStreamEmptyView extends React.PureComponent<LogTextStreamEmptyViewProps> {
  public render() {
    const { height, width, reload } = this.props;

    return (
      <LogTextStreamStaticPanel style={{ height, width }}>
        <LogTextStreamStaticContentPanel>
          <p>There are no log messages to display.</p>
          <EuiSpacer />
          <EuiButton color="primary" iconType="refresh" onClick={reload}>
            Check for new log messages
          </EuiButton>
        </LogTextStreamStaticContentPanel>
      </LogTextStreamStaticPanel>
    );
  }
}
