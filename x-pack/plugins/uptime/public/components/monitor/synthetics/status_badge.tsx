/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiBadge } from '@elastic/eui';
import React, { useContext, FC } from 'react';
import { UptimeAppColors } from '../../../apps/uptime_app';
import { UptimeThemeContext } from '../../../contexts';

interface StatusBadgeProps {
  status: string;
}

export function colorFromStatus(status: string, color: UptimeAppColors) {
  switch (status) {
    case 'succeeded':
      return color.success;
    case 'failed':
      return color.danger;
    default:
      return 'default';
  }
}

export function textFromStatus(status: string) {
  switch (status) {
    case 'succeeded':
      return 'Succeeded';
    case 'failed':
      return 'Failed';
    case 'skipped':
      return 'Skipped';
    default:
      return null;
  }
}

export const StatusBadge: FC<StatusBadgeProps> = ({ status }) => {
  const theme = useContext(UptimeThemeContext);
  return (
    <EuiBadge color={colorFromStatus(status, theme.colors)}>{textFromStatus(status)}</EuiBadge>
  );
};
