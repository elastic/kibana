/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

export const LogEntryExampleMessagesEmptyIndicator: React.FunctionComponent<{
  onReload: () => void;
}> = ({ onReload }) => (
  <EuiFlexGroup alignItems="center" justifyContent="center">
    <EuiFlexItem grow={false} className="eui-textNoWrap">
      <FormattedMessage
        id="xpack.infra.logs.logEntryExamples.exampleEmptyDescription"
        defaultMessage="No examples found within the selected time range. Increase the log entry retention period to improve message sample availability."
      />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiButton onClick={onReload} size="s">
        <FormattedMessage
          id="xpack.infra.logs.logEntryExamples.exampleEmptyReloadButtonLabel"
          defaultMessage="Reload"
        />
      </EuiButton>
    </EuiFlexItem>
  </EuiFlexGroup>
);
