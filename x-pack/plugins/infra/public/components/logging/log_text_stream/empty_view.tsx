/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import * as React from 'react';

interface LogTextStreamEmptyViewProps {
  reload: () => void;
}

export class LogTextStreamEmptyView extends React.PureComponent<LogTextStreamEmptyViewProps> {
  public render() {
    const { reload } = this.props;

    return (
      <EuiEmptyPrompt
        title={<h2>There are no log messages to display.</h2>}
        titleSize="m"
        body={<p>Try adjusting your filter.</p>}
        actions={
          <EuiButton iconType="refresh" color="primary" fill onClick={reload}>
            Check for new data
          </EuiButton>
        }
      />
    );
  }
}
