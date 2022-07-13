/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import { useTheme } from '@kbn/observability-plugin/public';
import { Ping } from '../../../../../common/runtime_types';
import { useSelectedLocation } from './hooks/use_selected_location';

export const MonitorSummaryLastRunInfo = ({ ping }: { ping: Ping }) => {
  const selectedLocation = useSelectedLocation();
  const isBrowserType = ping.monitor.type === 'browser';

  const theme = useTheme();

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        {ping.monitor.status === 'up' ? (
          <EuiBadge color={theme.eui.euiColorVis0}>
            {isBrowserType ? SUCCESS_LABEL : UP_LABEL}
          </EuiBadge>
        ) : ping.monitor.status === 'up' ? (
          <EuiBadge color={theme.eui.euiColorVis9}>
            {isBrowserType ? FAILED_LABEL : DOWN_LABEL}
          </EuiBadge>
        ) : (
          <EuiBadge color="default">{PENDING_LABEL}</EuiBadge>
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText className="eui-displayInline" size="s">
          {i18n.translate('xpack.synthetics.monitorSummary.lastRunLocation', {
            defaultMessage: 'in {loc}.',
            values: {
              // empty value will be replaced with value from location select
              loc: selectedLocation?.label ?? '--',
            },
          })}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText className="eui-displayInline" size="s">
          {ping.timestamp
            ? i18n.translate('xpack.synthetics.monitorSummary.lastRunTime', {
                defaultMessage: 'Last run on {time}',
                values: {
                  time: moment(ping.timestamp).format('LLL'),
                },
              })
            : WAITING}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorSummary.failed', {
  defaultMessage: 'Failed',
});

const PENDING_LABEL = i18n.translate('xpack.synthetics.monitorSummary.pending', {
  defaultMessage: 'Pending',
});

const SUCCESS_LABEL = i18n.translate('xpack.synthetics.monitorSummary.succeeded', {
  defaultMessage: 'Succeeded',
});

const UP_LABEL = i18n.translate('xpack.synthetics.monitorSummary.up', {
  defaultMessage: 'Up',
});

const DOWN_LABEL = i18n.translate('xpack.synthetics.monitorSummary.down', {
  defaultMessage: 'Down',
});

const WAITING = i18n.translate('xpack.synthetics.monitorSummary.waiting', {
  defaultMessage: 'Waiting for test run result.',
});
