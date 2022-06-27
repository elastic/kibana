/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiTextColor } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

export const LogEntryExampleMessagesFailureIndicator: React.FunctionComponent<{
  onRetry: () => void;
}> = ({ onRetry }) => (
  <EuiFlexGroup alignItems="center">
    <EuiFlexItem grow={false} className="eui-textNoWrap">
      <EuiTextColor color="danger">
        <FormattedMessage
          id="xpack.infra.logs.logEntryExamples.exampleLoadingFailureDescription"
          defaultMessage="Failed to load examples."
        />
      </EuiTextColor>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton onClick={onRetry} size="s">
        <FormattedMessage
          id="xpack.infra.logs.logEntryExamples.exampleLoadingFailureRetryButtonLabel"
          defaultMessage="Retry"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
