/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLoadingChart, EuiPanel, EuiText } from '@elastic/eui';
import * as React from 'react';

import {
  LogTextStreamStaticContentPanel,
  LogTextStreamStaticPanel,
} from './static_panel';

interface LogTextStreamLoadingViewProps {
  height: number;
  width: number;
}

export class LogTextStreamLoadingView extends React.PureComponent<
  LogTextStreamLoadingViewProps,
  {}
> {
  public render() {
    const { height, width } = this.props;

    return (
      <LogTextStreamStaticPanel style={{ height, width }}>
        <LogTextStreamStaticContentPanel>
          <EuiPanel>
            <EuiLoadingChart size="m" />
            <EuiText>
              <p>Loading entries</p>
            </EuiText>
          </EuiPanel>
        </LogTextStreamStaticContentPanel>
      </LogTextStreamStaticPanel>
    );
  }
}
