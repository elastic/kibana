/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import moment from 'moment';
import React from 'react';

interface Props {
  duration?: string;
  host?: string;
  port?: string;
  scheme?: string;
  status?: string;
  timestamp?: string;
}

export const StatusBar = ({ timestamp, host, port, duration, scheme, status }: Props) => (
  <EuiPanel>
    <EuiFlexGroup gutterSize="l">
      <EuiFlexItem grow={false}>
        <EuiHealth
          aria-label={i18n.translate('xpack.uptime.monitorStatusBar.healthStatusMessageAriaLabel', {
            defaultMessage: 'Monitor status',
          })}
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
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.healthStatus.hostMessage"
          values={{ host }}
          defaultMessage="Host: {host}"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.healthStatus.portMessage"
          values={{ port }}
          defaultMessage="Port: {port}"
        />
      </EuiFlexItem>
      <EuiFlexItem
        aria-label={i18n.translate('xpack.uptime.monitorStatusBar.durationTextAriaLabel', {
          defaultMessage: 'Monitor duration in milliseconds',
        })}
        grow={false}
      >
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.healthStatus.durationInMillisecondsMessage"
          // TODO: this should not be computed inline
          values={{ duration }}
          defaultMessage="{duration}ms"
          description="The 'ms' is an abbreviation for 'milliseconds'."
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FormattedMessage
          id="xpack.uptime.monitorStatusBar.healthStatus.schemeMessage"
          values={{ scheme }}
          defaultMessage="Scheme: {scheme}"
        />
      </EuiFlexItem>
      <EuiFlexItem
        aria-label={i18n.translate('xpack.uptime.monitorStatusBar.timestampFromNowTextAriaLabel', {
          defaultMessage: 'Time since last check',
        })}
        grow={false}
      >
        {moment(timestamp).fromNow()}
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiPanel>
);
