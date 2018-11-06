/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import * as React from 'react';

interface LogTextStreamEmptyViewProps {
  reload: () => void;
}

export class LogTextStreamEmptyView extends React.PureComponent<LogTextStreamEmptyViewProps> {
  public render() {
    const { reload } = this.props;

    return (
      <EuiEmptyPrompt
        title={
          <h2>
            <FormattedMessage
              id="xpack.infra.logTextStreamEmptyView.noLogMessageToDisplayTitle"
              defaultMessage="There are no log messages to display."
            />
          </h2>
        }
        titleSize="m"
        body={
          <p>
            <FormattedMessage
              id="xpack.infra.logTextStreamEmptyView.adjustingFilterTryDescription"
              defaultMessage="Try adjusting your filter."
            />
          </p>
        }
        actions={
          <EuiButton iconType="refresh" color="primary" fill onClick={reload}>
            <FormattedMessage
              id="xpack.infra.logTextStreamEmptyView.checkForNewDataButtonLabel"
              defaultMessage="Check for new data"
            />
          </EuiButton>
        }
      />
    );
  }
}
