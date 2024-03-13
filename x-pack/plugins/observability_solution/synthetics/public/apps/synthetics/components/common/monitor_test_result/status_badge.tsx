/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiBadge, IconColor, EuiThemeComputed, EuiSkeletonText } from '@elastic/eui';

type MonitorStatus = 'succeeded' | 'failed' | 'skipped' | 'unknown';
export const StatusBadge = ({ status }: { status: MonitorStatus }) => {
  if (status === 'unknown') {
    return <EuiSkeletonText lines={1} />;
  }

  return (
    <EuiBadge color={getBadgeColorForMonitorStatus(status)} css={{ maxWidth: 'max-content' }}>
      {status === 'succeeded' ? COMPLETE_LABEL : status === 'failed' ? FAILED_LABEL : SKIPPED_LABEL}
    </EuiBadge>
  );
};

export const parseBadgeStatus = (status?: string) => {
  switch (status) {
    case 'succeeded':
    case 'success':
    case 'up':
      return 'succeeded';
    case 'fail':
    case 'failed':
    case 'down':
      return 'failed';
    case 'skip':
    case 'skipped':
      return 'skipped';
    default:
      return 'unknown';
  }
};

export const getBadgeColorForMonitorStatus = (status: MonitorStatus): IconColor => {
  return status === 'succeeded' ? 'success' : status === 'failed' ? 'danger' : 'default';
};

export const getTextColorForMonitorStatus = (
  status: MonitorStatus
): keyof EuiThemeComputed['colors'] => {
  return status === 'skipped' ? 'disabledText' : 'text';
};

export const COMPLETE_LABEL = i18n.translate('xpack.synthetics.monitorStatus.complete', {
  defaultMessage: 'Complete',
});

export const FAILED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.failed', {
  defaultMessage: 'Failed',
});

export const SKIPPED_LABEL = i18n.translate('xpack.synthetics.monitorStatus.skipped', {
  defaultMessage: 'Skipped',
});
