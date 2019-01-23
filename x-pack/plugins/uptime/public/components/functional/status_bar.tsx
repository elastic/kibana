/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';

interface Props {
  duration?: number;
  url?: string;
  status?: string;
  timestamp?: string;
}

export const StatusBar = ({ timestamp, url, duration, status }: Props) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiHealth
              color={status === 'up' ? 'success' : 'danger'}
              style={{ lineHeight: 'inherit' }}
            >
              {status === 'up'
                ? i18n.translate('xpack.uptime.monitorStatusBar.healthStatusMessage.upLabel', {
                    defaultMessage: 'Up',
                  })
                : i18n.translate('xpack.uptime.monitorStatusBar.healthStatusMessage.downLabel', {
                    defaultMessage: 'Down',
                  })}
            </EuiHealth>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexItem grow={false}>
          <EuiLink href={url} target="_blank">
            {url}
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.healthStatus.durationInMillisecondsMessage"
          // TODO: this should not be computed inline
          values={{ duration: duration ? duration / 1000 : 0 }}
          defaultMessage="{duration}ms"
          description="The 'ms' is an abbreviation for 'milliseconds'."
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>{moment(timestamp).fromNow()}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
