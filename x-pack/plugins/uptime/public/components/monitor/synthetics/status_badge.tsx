/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useContext, FC } from 'react';
import { UptimeAppColors } from '../../../apps/uptime_app';
import { UptimeThemeContext } from '../../../contexts';

interface StatusBadgeProps {
  status?: string;
}

export function colorFromStatus(color: UptimeAppColors, status?: string) {
  switch (status) {
    case 'succeeded':
      return color.success;
    case 'failed':
      return color.danger;
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

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const theme = useContext(UptimeThemeContext);
  return (
    <EuiBadge color={colorFromStatus(theme.colors, status)}>{textFromStatus(status)}</EuiBadge>
  );
};
