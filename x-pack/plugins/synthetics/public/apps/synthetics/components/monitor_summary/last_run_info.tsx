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
import { UNNAMED_LOCATION } from '../../../../../common/constants';
import { Ping } from '../../../../../common/runtime_types';

export const MonitorSummaryLastRunInfo = ({ ping }: { ping: Ping }) => {
  const isBrowserType = ping.monitor.type === 'browser';

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        {ping.monitor.status === 'up' ? (
          <EuiBadge color="success">{isBrowserType ? SUCCESS_LABEL : UP_LABEL}</EuiBadge>
        ) : (
          <EuiBadge color="danger">{isBrowserType ? FAILED_LABEL : DOWN_LABEL}</EuiBadge>
        )}
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText className="eui-displayInline" size="m">
          {i18n.translate('xpack.synthetics.monitorSummary.lastRunTime', {
            defaultMessage: 'in {loc}. Last run on {time}',
            values: {
              loc: ping.observer?.geo?.name ?? UNNAMED_LOCATION,
              time: moment(ping.timestamp).format('LLL'),
            },
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorSummary.failed', {
  defaultMessage: 'Failed',
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
