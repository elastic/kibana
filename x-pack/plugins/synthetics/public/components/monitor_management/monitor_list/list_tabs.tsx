/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTabs,
  EuiTab,
  EuiNotificationBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, Fragment, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';
import { MonitorManagementListPageState } from './monitor_list';
import { ConfigKey } from '../../../../common/runtime_types';

export const MonitorListTabs = ({
  invalidTotal,
  onUpdate,
  onPageStateChange,
}: {
  invalidTotal: number;
  onUpdate: () => void;
  onPageStateChange: (state: MonitorManagementListPageState) => void;
}) => {
  const [selectedTabId, setSelectedTabId] = useState('all');

  const { refreshApp } = useUptimeRefreshContext();

  const history = useHistory();

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();

  useEffect(() => {
    setSelectedTabId(viewType);
    onPageStateChange({ pageIndex: 1, pageSize: 10, sortOrder: 'asc', sortField: ConfigKey.NAME });
  }, [viewType, onPageStateChange]);

  const tabs = [
    {
      id: 'all',
      name: ALL_MONITORS_LABEL,
      content: <Fragment />,
      href: history.createHref({ pathname: '/manage-monitors/all' }),
      disabled: false,
    },
    {
      id: 'invalid',
      name: INVALID_MONITORS_LABEL,
      append: (
        <EuiNotificationBadge
          className="eui-alignCenter"
          size="m"
          color={invalidTotal === 0 ? 'subdued' : 'accent'}
        >
          {invalidTotal}
        </EuiNotificationBadge>
      ),
      href: history.createHref({ pathname: '/manage-monitors/invalid' }),
      content: <Fragment />,
      disabled: invalidTotal === 0,
    },
  ];

  const onSelectedTabChanged = (id: string) => {
    setSelectedTabId(id);
  };

  const renderTabs = () => {
    return tabs.map((tab, index) => (
      <EuiTab
        key={index}
        href={tab.href}
        onClick={() => onSelectedTabChanged(tab.id)}
        isSelected={tab.id === selectedTabId}
        disabled={tab.disabled}
        append={tab.append}
      >
        {tab.name}
      </EuiTab>
    ));
  };

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>
        <EuiTabs>{renderTabs()}</EuiTabs>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          iconType="refresh"
          aria-label={REFRESH_LABEL}
          onClick={() => {
            onUpdate();
            refreshApp();
          }}
        >
          {REFRESH_LABEL}
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const REFRESH_LABEL = i18n.translate('xpack.uptime.monitorList.refresh', {
  defaultMessage: 'Refresh',
});

export const INVALID_MONITORS_LABEL = i18n.translate('xpack.uptime.monitorList.invalidMonitors', {
  defaultMessage: 'Invalid monitors',
});

export const ALL_MONITORS_LABEL = i18n.translate('xpack.uptime.monitorList.allMonitors', {
  defaultMessage: 'All monitors',
});
