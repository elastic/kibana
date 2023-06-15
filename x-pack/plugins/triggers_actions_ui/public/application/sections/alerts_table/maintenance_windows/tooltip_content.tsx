/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBadge, EuiText, formatDate } from '@elastic/eui';
import {
  MaintenanceWindow,
  STATUS_DISPLAY,
  MAINTENANCE_WINDOW_DATE_FORMAT,
} from '@kbn/alerting-plugin/common';
import { css } from '@emotion/react';

const START_TIME = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.maintenanceWindowTooltip.startTime',
  {
    defaultMessage: 'Start time',
  }
);

const END_TIME = i18n.translate(
  'xpack.triggersActionsUI.alertsTable.maintenanceWindowTooltip.endTime',
  {
    defaultMessage: 'End time',
  }
);

const textStyle = css`
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

interface TooltipContentProps {
  maintenanceWindow: MaintenanceWindow;
}

export const TooltipContent = memo((props: TooltipContentProps) => {
  const { maintenanceWindow } = props;
  const { status, title, eventStartTime, eventEndTime } = maintenanceWindow;

  return (
    <EuiFlexGroup gutterSize="xs" direction="column">
      <EuiFlexGroup>
        <EuiFlexItem grow={false}>
          <EuiBadge color={STATUS_DISPLAY[status].color}>{STATUS_DISPLAY[status].label}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexItem grow={false}>
        <EuiText size="relative" css={textStyle}>
          <strong>{title}</strong>
        </EuiText>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <EuiText size="relative">
              <strong>{START_TIME}:</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="relative">
              {formatDate(eventStartTime, MAINTENANCE_WINDOW_DATE_FORMAT)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" direction="column">
          <EuiFlexItem>
            <EuiText size="relative">
              <strong>{END_TIME}:</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="relative">
              {formatDate(eventEndTime, MAINTENANCE_WINDOW_DATE_FORMAT)}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
