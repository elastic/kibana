/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

interface Props {
  monitorId: string;
  message?: string;
}

export const EmptyStatusBar = ({ message, monitorId }: Props) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={false}>
        {!message
          ? i18n.translate('xpack.uptime.emptyStatusBar.defaultMessage', {
              defaultMessage: 'No data found for monitor id {monitorId}',
              description:
                'This is the default message we display in a status bar when there is no data available for an uptime monitor.',
              values: { monitorId },
            })
          : message}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
