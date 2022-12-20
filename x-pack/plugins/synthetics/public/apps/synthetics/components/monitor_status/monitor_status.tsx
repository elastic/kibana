/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiDescriptionList, EuiBadge, EuiLoadingSpinner } from '@elastic/eui';
import { LABELS } from '../monitors_page/overview/overview/monitor_status_flyout';
import { EncryptedSyntheticsMonitor } from '../monitors_page/overview/types';

export interface MonitorStatusProps {
  monitor: EncryptedSyntheticsMonitor;
  loading?: boolean;
  status?: string;
  compressed?: boolean;
}

const statusListItems = ({ monitor, loading, status }: MonitorStatusProps) => {
  const isBrowserType = monitor.type === 'browser';

  const badge = () => {
    switch (true) {
      case loading:
        return <EuiLoadingSpinner size="s" />;
      case !status:
        return <EuiBadge color="default">{LABELS.PENDING}</EuiBadge>;
      case status === 'up':
        return <EuiBadge color="success">{isBrowserType ? LABELS.SUCCESS : LABELS.UP}</EuiBadge>;
      default:
        return <EuiBadge color="danger">{isBrowserType ? LABELS.FAILED : LABELS.DOWN}</EuiBadge>;
    }
  };

  return [{ title: LABELS.STATUS, description: badge }];
};
export const MonitorStatus = ({
  monitor,
  loading,
  status,
  compressed = true,
}: MonitorStatusProps) => {
  return (
    <EuiDescriptionList
      align="left"
      compressed={compressed}
      listItems={statusListItems({ monitor, loading, status })}
    />
  );
};
