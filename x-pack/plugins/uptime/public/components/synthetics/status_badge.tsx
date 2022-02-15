/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, FC } from 'react';
import { UptimeAppColors } from '../../apps/uptime_app';
import { UptimeThemeContext } from '../../contexts';

interface StatusBadgeProps {
  isMobile?: boolean;
  status?: string;
  stepNo: number;
}

export function colorFromStatus(color: UptimeAppColors, status?: string) {
  switch (status) {
    case 'succeeded':
      return color.success;
    case 'failed':
      return color.dangerBehindText;
    default:
      return 'default';
  }
}

export function textFromStatus(status?: string) {
  switch (status) {
    case 'succeeded':
      return i18n.translate('xpack.uptime.synthetics.statusBadge.succeededMessage', {
        defaultMessage: 'Succeeded',
      });
    case 'failed':
      return i18n.translate('xpack.uptime.synthetics.statusBadge.failedMessage', {
        defaultMessage: 'Failed',
      });
    case 'skipped':
      return i18n.translate('xpack.uptime.synthetics.statusBadge.skippedMessage', {
        defaultMessage: 'Skipped',
      });
    default:
      return null;
  }
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status, stepNo, isMobile }) => {
  const theme = useContext(UptimeThemeContext);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s">
      {!isMobile && (
        <EuiFlexItem grow={false}>
          <EuiText className="eui-textNoWrap">
            <strong>{stepNo}.</strong>
          </EuiText>
        </EuiFlexItem>
      )}
      <EuiFlexItem grow={false}>
        <EuiBadge color={colorFromStatus(theme.colors, status)}>{textFromStatus(status)}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
