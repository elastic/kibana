/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiHealth, EuiFlexGroup, EuiFlexItem, EuiText, EuiToolTip } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface MonitorListStatusColumnProps {
  absoluteTime: string;
  relativeTime: string;
  status: string;
}

export const MonitorListStatusColumn = ({
  absoluteTime,
  relativeTime,
  status,
}: MonitorListStatusColumnProps) => (
  <EuiFlexGroup alignItems="center" gutterSize="none">
    <EuiFlexItem>
      <EuiHealth color={status === 'up' ? 'success' : 'danger'} style={{ display: 'block' }}>
        {status === 'up'
          ? i18n.translate('xpack.uptime.monitorList.statusColumn.upLabel', {
              defaultMessage: 'Up',
            })
          : i18n.translate('xpack.uptime.monitorList.statusColumn.downLabel', {
              defaultMessage: 'Down',
            })}
      </EuiHealth>
      <EuiToolTip
        content={
          <EuiText color="ghost" size="xs">
            {absoluteTime}
          </EuiText>
        }
      >
        <EuiText size="xs" color="subdued">
          {relativeTime}
        </EuiText>
      </EuiToolTip>
    </EuiFlexItem>
  </EuiFlexGroup>
);
