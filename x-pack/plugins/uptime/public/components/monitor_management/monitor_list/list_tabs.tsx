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
  EuiButtonIcon,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState, Fragment, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { Ping } from '../../../../common/runtime_types';
import { useUptimeRefreshContext } from '../../../contexts/uptime_refresh_context';

export const MonitorListTabs = ({
  errorSummaries,
  onUpdate,
}: {
  errorSummaries: Ping[];
  onUpdate: () => void;
}) => {
  const [selectedTabId, setSelectedTabId] = useState('all');

  const { refreshApp } = useUptimeRefreshContext();

  const history = useHistory();

  const { type: viewType } = useParams<{ type: 'all' | 'invalid' }>();

  useEffect(() => {
    setSelectedTabId(viewType);
  }, [viewType]);

  const tabs = [
    {
      id: 'all',
      name: 'All monitors',
      content: <Fragment />,
      href: history.createHref({ pathname: '/manage-monitors/all' }),
      disabled: false,
    },
    {
      id: 'invalid',
      name: 'Invalid monitors',
      append: (
        <EuiNotificationBadge
          className="eui-alignCenter"
          size="m"
          color={errorSummaries?.length === 0 ? 'subdued' : 'accent'}
        >
          {errorSummaries.length}
        </EuiNotificationBadge>
      ),
      href: history.createHref({ pathname: '/manage-monitors/invalid' }),
      content: <Fragment />,
      disabled: errorSummaries?.length === 0,
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
        <EuiButtonIcon
          iconType="refresh"
          aria-label={REFRESH_LABEL}
          onClick={() => {
            onUpdate();
            refreshApp();
          }}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const REFRESH_LABEL = i18n.translate('xpack.uptime.monitorList.refresh', {
  defaultMessage: 'Refresh list',
});
