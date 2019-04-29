/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiHealth, EuiLink, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { get } from 'lodash';
import moment from 'moment';
import React from 'react';
import { Ping } from '../../../common/graphql/types';
import { UptimeGraphQLQueryProps, withUptimeGraphQL } from '../higher_order';
import { monitorStatusBarQuery } from '../../queries';
import { EmptyStatusBar } from './empty_status_bar';
import { convertMicrosecondsToMilliseconds } from '../../lib/helper';

interface MonitorStatusBarQueryResult {
  monitorStatus?: Ping[];
}

interface MonitorStatusBarProps {
  monitorId: string;
}

type Props = MonitorStatusBarProps & UptimeGraphQLQueryProps<MonitorStatusBarQueryResult>;

export const MonitorStatusBarComponent = ({ data, monitorId }: Props) => {
  if (data && data.monitorStatus && data.monitorStatus.length) {
    const { monitor, timestamp } = data.monitorStatus[0];
    const duration = get(monitor, 'duration.us', undefined);
    const status = get<'up' | 'down'>(monitor, 'status', 'down');
    const full = get(data.monitorStatus[0], 'url.full');
    return (
      <EuiPanel>
        <EuiFlexGroup gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiHealth
              aria-label={i18n.translate(
                'xpack.uptime.monitorStatusBar.healthStatusMessageAriaLabel',
                {
                  defaultMessage: 'Monitor status',
                }
              )}
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
            <EuiFlexItem grow={false}>
              <EuiLink
                aria-label={i18n.translate(
                  'xpack.uptime.monitorStatusBar.monitorUrlLinkAriaLabel',
                  {
                    defaultMessage: 'Monitor URL link',
                  }
                )}
                href={full}
                target="_blank"
              >
                {full}
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexItem>
          {!!duration && (
            <EuiFlexItem
              aria-label={i18n.translate('xpack.uptime.monitorStatusBar.durationTextAriaLabel', {
                defaultMessage: 'Monitor duration in milliseconds',
              })}
              grow={false}
            >
              <FormattedMessage
                id="xpack.uptime.monitorStatusBar.healthStatus.durationInMillisecondsMessage"
                values={{ duration: convertMicrosecondsToMilliseconds(duration) }}
                defaultMessage="{duration}ms"
                description="The 'ms' is an abbreviation for 'milliseconds'."
              />
            </EuiFlexItem>
          )}
          <EuiFlexItem
            aria-label={i18n.translate(
              'xpack.uptime.monitorStatusBar.timestampFromNowTextAriaLabel',
              {
                defaultMessage: 'Time since last check',
              }
            )}
            grow={false}
          >
            {moment(new Date(timestamp).valueOf()).fromNow()}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
  return (
    <EmptyStatusBar
      message={i18n.translate('xpack.uptime.monitorStatusBar.loadingMessage', {
        defaultMessage: 'Loading…',
      })}
      monitorId={monitorId}
    />
  );
};

export const MonitorStatusBar = withUptimeGraphQL<
  MonitorStatusBarQueryResult,
  MonitorStatusBarProps
>(MonitorStatusBarComponent, monitorStatusBarQuery);
